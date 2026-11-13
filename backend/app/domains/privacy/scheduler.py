"""In-process erasure purge scheduler (closes K-25: "nothing schedules it yet").

Interim, single-process solution: no new infrastructure, no recurring cost, no new approval needed — it is the same
`PrivacyService.purge_due` the CLI already calls (scripts/admin_cli.py purge-due), just run on a timer inside the app
process instead of by hand. `purge_due` only touches `data_requests` rows that are still `pending` and past their
`scheduled_for` time, so running this on more than one app instance at once is safe, merely redundant (each extra run
finds nothing left to do). A real job queue (Redis + a worker, T-6) remains the right answer once the app is scaled
horizontally with a need for other scheduled/async work; this is not that, by design — see docs/KNOWN_ISSUES.md K-25.
"""

import asyncio
import contextlib
from collections.abc import Awaitable, Callable

import structlog
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.config import Settings
from app.domains.privacy.service import PrivacyService

log = structlog.get_logger()

RunOnce = Callable[[], Awaitable[int]]


class PurgeScheduler:
    """Runs a zero-argument async callable on a fixed interval, starting immediately, until `stop()` is called.
    The timing loop is intentionally generic (and so unit-testable without a database); `for_privacy` below wires it
    to `PrivacyService.purge_due`."""

    def __init__(
        self, run_once: RunOnce, interval_seconds: float, sleep: Callable[[float], Awaitable[None]] = asyncio.sleep
    ) -> None:
        self._run_once, self._interval, self._sleep = run_once, interval_seconds, sleep
        self._task: asyncio.Task[None] | None = None

    @property
    def running(self) -> bool:
        return self._task is not None and not self._task.done()

    def start(self) -> None:
        if self._task is None:
            self._task = asyncio.create_task(self._loop(), name="privacy-purge-scheduler")

    async def stop(self) -> None:
        if self._task is not None:
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._task
            self._task = None

    async def _loop(self) -> None:
        while True:
            try:
                await self._run_once()
            except Exception:  # one bad run must never silently stop future runs
                log.exception("privacy_purge_failed")
            await self._sleep(self._interval)


def for_privacy(sessionmaker: async_sessionmaker[AsyncSession], settings: Settings) -> PurgeScheduler:
    async def run_once() -> int:
        async with sessionmaker() as session:
            done = await PrivacyService(session, settings).purge_due()
            await session.commit()
        if done:
            log.info("privacy_purge_ran", accounts_erased=len(done))
        return len(done)

    return PurgeScheduler(run_once, settings.purge_interval_seconds)
