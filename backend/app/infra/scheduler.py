"""Generic interval scheduler: runs a zero-argument async callable on a fixed interval, starting immediately, until
stopped. Used for every in-process background job in this app (erasure purge, Wealth OS event dispatch) instead of a
separate worker process — see app/domains/privacy/scheduler.py and app/domains/events/dispatcher.py for the jobs
themselves. No I/O of its own: easy to unit-test with a fake clock."""

import asyncio
import contextlib
from collections.abc import Awaitable, Callable

import structlog

log = structlog.get_logger()

RunOnce = Callable[[], Awaitable[object]]


class IntervalScheduler:
    def __init__(
        self, name: str, run_once: RunOnce, interval_seconds: float, sleep: Callable[[float], Awaitable[None]] = asyncio.sleep
    ) -> None:
        self._name, self._run_once, self._interval, self._sleep = name, run_once, interval_seconds, sleep
        self._task: asyncio.Task[None] | None = None

    @property
    def running(self) -> bool:
        return self._task is not None and not self._task.done()

    def start(self) -> None:
        if self._task is None:
            self._task = asyncio.create_task(self._loop(), name=self._name)

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
                log.exception("scheduled_job_failed", job=self._name)
            await self._sleep(self._interval)
