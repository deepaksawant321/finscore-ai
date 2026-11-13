import asyncio

import pytest

from app.domains.privacy.scheduler import PurgeScheduler


class FakeClock:
    """A controllable `sleep`: callers block on an asyncio.Event until the test explicitly lets them through."""

    def __init__(self) -> None:
        self.calls: list[float] = []
        self._gate = asyncio.Event()

    async def sleep(self, seconds: float) -> None:
        self.calls.append(seconds)
        self._gate.clear()
        await self._gate.wait()

    def release(self) -> None:
        self._gate.set()


async def _settle() -> None:
    for _ in range(5):
        await asyncio.sleep(0)


async def test_runs_immediately_on_start_without_waiting_for_the_interval() -> None:
    calls = 0

    async def run_once() -> int:
        nonlocal calls
        calls += 1
        return 0

    clock = FakeClock()
    sched = PurgeScheduler(run_once, 3600, sleep=clock.sleep)
    sched.start()
    await _settle()
    assert calls == 1 and clock.calls == [3600]  # ran once, then is waiting out the interval
    await sched.stop()


async def test_runs_again_each_time_the_interval_elapses() -> None:
    calls = 0

    async def run_once() -> int:
        nonlocal calls
        calls += 1
        return 0

    clock = FakeClock()
    sched = PurgeScheduler(run_once, 60, sleep=clock.sleep)
    sched.start()
    await _settle()
    assert calls == 1
    for n in (2, 3, 4):
        clock.release()
        await _settle()
        assert calls == n
    await sched.stop()


async def test_a_failing_run_does_not_stop_future_runs() -> None:
    calls = 0

    async def run_once() -> int:
        nonlocal calls
        calls += 1
        if calls == 1:
            raise RuntimeError("boom")
        return 0

    clock = FakeClock()
    sched = PurgeScheduler(run_once, 60, sleep=clock.sleep)
    sched.start()
    await _settle()
    assert calls == 1 and sched.running  # the exception did not kill the task
    clock.release()
    await _settle()
    assert calls == 2
    await sched.stop()


async def test_start_is_idempotent() -> None:
    calls = 0

    async def run_once() -> int:
        nonlocal calls
        calls += 1
        return 0

    clock = FakeClock()
    sched = PurgeScheduler(run_once, 60, sleep=clock.sleep)
    sched.start()
    await _settle()
    task = sched._task  # noqa: SLF001
    sched.start()  # second call must not spawn a second loop
    assert sched._task is task  # noqa: SLF001
    await sched.stop()


async def test_stop_cancels_a_run_in_progress_and_can_be_called_when_not_running() -> None:
    started = asyncio.Event()

    async def run_once() -> int:
        started.set()
        await asyncio.sleep(10)  # would hang the test if not actually cancelled
        return 0

    sched = PurgeScheduler(run_once, 60)
    sched.start()
    await started.wait()
    await asyncio.wait_for(sched.stop(), timeout=2)
    assert not sched.running
    await sched.stop()  # calling stop again is a no-op, not an error


async def test_stop_before_start_is_a_no_op() -> None:
    async def run_once() -> int:
        return 0

    sched = PurgeScheduler(run_once, 60)
    await sched.stop()
    assert not sched.running


@pytest.mark.parametrize("n", [1, 2, 3])
async def test_running_reflects_task_state(n: int) -> None:
    async def run_once() -> int:
        return 0

    clock = FakeClock()
    sched = PurgeScheduler(run_once, n, sleep=clock.sleep)
    assert not sched.running
    sched.start()
    await _settle()
    assert sched.running
    await sched.stop()
    assert not sched.running
