"""Wealth OS dispatcher: the consuming half of the outbox pattern (AC-20). Polls `domain_events` for undispatched
rows and runs each one's registered handlers, one event per transaction so a failure in one event can never roll back
another. A handler failing repeatedly does not retry forever: after `settings.wealth_os_max_attempts` the event is
marked dispatched anyway (giving up, loudly logged) rather than stuck retrying.

Today every event type shares one handler — "bring this user's actions and nudges up to date" — because that is the
concrete coordination gap this closes: previously, Actions/Today only recomputed when the user opened that page
(K-37/K-39); now a changed fact, a new score, a goal, or a verified action refreshes them in the background. Handlers
are intentionally idempotent (ActionService.refresh and NudgeService.refresh already are, by digest/dedupe-key), so
re-running one for the same event — or for a cascade of events it indirectly causes — settles rather than loops: a
verified action can itself produce a new ScoreComputed event, which is handled on the NEXT poll, not recursively.
"""

import uuid
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.config import Settings
from app.domains.actions.service import ActionService
from app.domains.events import bus
from app.domains.events.models import DomainEvent
from app.domains.nudges.service import NudgeService
from app.infra.errors import AppError
from app.infra.scheduler import IntervalScheduler

log = structlog.get_logger()

Handler = Callable[[AsyncSession, Settings, DomainEvent], Awaitable[None]]


async def _refresh_wealth(session: AsyncSession, settings: Settings, event: DomainEvent) -> None:
    try:
        await ActionService(session, settings).refresh(event.user_id)
    except AppError:
        pass  # e.g. the action rulebook is not approved in production: nothing to coordinate yet
    try:
        await NudgeService(session, settings).refresh(event.user_id)
    except AppError:
        pass


HANDLERS: dict[str, list[Handler]] = {
    bus.FACT_CHANGED: [_refresh_wealth],
    bus.SCORE_COMPUTED: [_refresh_wealth],
    bus.GOAL_UPDATED: [_refresh_wealth],
    bus.ACTION_VERIFIED: [_refresh_wealth],
}


async def dispatch_pending(sessionmaker: async_sessionmaker[AsyncSession], settings: Settings, batch_size: int = 100) -> int:
    """Processes up to `batch_size` undispatched events (oldest first) and returns how many were dispatched
    (successfully or given up on — both count as "no longer pending"). Safe to call concurrently or repeatedly."""
    async with sessionmaker() as session:
        q = select(DomainEvent.id).where(DomainEvent.dispatched_at.is_(None)).order_by(DomainEvent.occurred_at).limit(batch_size)
        ids = list((await session.execute(q)).scalars().all())

    processed = 0
    for event_id in ids:
        if await _dispatch_one(sessionmaker, settings, event_id):
            processed += 1
    return processed


async def _dispatch_one(sessionmaker: async_sessionmaker[AsyncSession], settings: Settings, event_id: uuid.UUID) -> bool:
    async with sessionmaker() as session:
        event = await session.get(DomainEvent, event_id)
        if event is None or event.dispatched_at is not None:
            return False  # already handled (e.g. by a concurrent dispatch call)
        try:
            for handler in HANDLERS.get(event.event_type, ()):
                await handler(session, settings, event)
            event.dispatched_at = datetime.now(UTC)
            await session.commit()
            return True
        except Exception as exc:
            await session.rollback()
            return await _record_failure(sessionmaker, event_id, exc, settings)


async def _record_failure(
    sessionmaker: async_sessionmaker[AsyncSession], event_id: uuid.UUID, exc: Exception, settings: Settings
) -> bool:
    async with sessionmaker() as session:
        event = await session.get(DomainEvent, event_id)
        if event is None:
            return False
        event.attempts += 1
        event.last_error = type(exc).__name__[:100]
        gave_up = event.attempts >= settings.wealth_os_max_attempts
        if gave_up:
            event.dispatched_at = datetime.now(UTC)
            log.error(
                "wealth_os_event_failed_permanently", event_id=str(event_id), event_type=event.event_type, attempts=event.attempts
            )
        else:
            log.warning(
                "wealth_os_event_failed_will_retry", event_id=str(event_id), event_type=event.event_type, attempts=event.attempts
            )
        await session.commit()
        return gave_up


def for_wealth_os(sessionmaker: async_sessionmaker[AsyncSession], settings: Settings) -> IntervalScheduler:
    async def run_once() -> int:
        n = await dispatch_pending(sessionmaker, settings)
        if n:
            log.info("wealth_os_dispatched", count=n)
        return n

    return IntervalScheduler("wealth-os-dispatcher", run_once, settings.wealth_os_interval_seconds)
