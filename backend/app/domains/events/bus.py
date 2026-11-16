"""Wealth OS event bus: the publishing half of the outbox pattern (AC-20). `publish` only ever `session.add`s a row —
it never commits — so publishing an event is atomic with whatever write caused it: both land, or neither does."""

import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.events.models import DomainEvent

FACT_CHANGED = "fact_changed"
SCORE_COMPUTED = "score_computed"
GOAL_UPDATED = "goal_updated"
ACTION_VERIFIED = "action_verified"
EVENT_TYPES = (FACT_CHANGED, SCORE_COMPUTED, GOAL_UPDATED, ACTION_VERIFIED)


def publish(session: AsyncSession, user_id: uuid.UUID, event_type: str, payload: dict[str, str] | None = None) -> DomainEvent:
    if event_type not in EVENT_TYPES:
        raise ValueError(f"unknown event type: {event_type}")
    event = DomainEvent(
        id=uuid.uuid4(), user_id=user_id, event_type=event_type, payload=payload or {}, occurred_at=datetime.now(UTC)
    )
    session.add(event)
    return event
