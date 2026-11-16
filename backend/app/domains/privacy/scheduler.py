"""In-process erasure purge scheduler (closes K-25: "nothing schedules it yet").

Interim, single-process solution: no new infrastructure, no recurring cost, no new approval needed — it is the same
`PrivacyService.purge_due` the CLI already calls (scripts/admin_cli.py purge-due), just run on a timer inside the app
process instead of by hand. `purge_due` only touches `data_requests` rows that are still `pending` and past their
`scheduled_for` time, so running this on more than one app instance at once is safe, merely redundant (each extra run
finds nothing left to do). A real job queue (Redis + a worker, T-6) remains the right answer once the app is scaled
horizontally with a need for other scheduled/async work; this is not that, by design — see docs/KNOWN_ISSUES.md K-25.
"""

import structlog
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.config import Settings
from app.domains.privacy.service import PrivacyService
from app.infra.scheduler import IntervalScheduler

log = structlog.get_logger()


def for_privacy(sessionmaker: async_sessionmaker[AsyncSession], settings: Settings) -> IntervalScheduler:
    async def run_once() -> int:
        async with sessionmaker() as session:
            done = await PrivacyService(session, settings).purge_due()
            await session.commit()
        if done:
            log.info("privacy_purge_ran", accounts_erased=len(done))
        return len(done)

    return IntervalScheduler("privacy-purge-scheduler", run_once, settings.purge_interval_seconds)
