import asyncio

import httpx
import pytest
from sqlalchemy import text

from tests.conftest import PASSWORD
from tests.integration.test_governance_goals import user

API = "/api/v1"


async def test_the_scheduler_purges_a_due_erasure_without_the_cli(client: httpx.AsyncClient, app, mailer) -> None:  # type: ignore[no-untyped-def]
    """End-to-end: drives the real FastAPI lifespan (the test fixtures normally bypass it) so the erasure request
    created through the API is actually purged by the background scheduler, with no CLI/admin step."""
    ha = await user(client, mailer, "scheduler@example.com")
    app.state.settings.erasure_cooling_days = 0  # due immediately, for this test only
    app.state.settings.purge_interval_seconds = 60  # cadence does not matter here: the first run fires on start

    r = await client.post(f"{API}/users/me/erasure-request", headers=ha, json={"password": PASSWORD})
    assert r.status_code == 202

    async with app.router.lifespan_context(app):
        scheduler = app.state.purge_scheduler
        assert scheduler is not None and scheduler.running

        for _ in range(200):
            await asyncio.sleep(0.01)
            async with app.state.sessionmaker() as s:
                left = (
                    await s.execute(text("SELECT count(*) FROM data_requests WHERE status='pending' AND kind='erasure'"))
                ).scalar_one()
            if left == 0:
                break
        else:
            pytest.fail("scheduler did not purge the due erasure request in time")

        async with app.state.sessionmaker() as s:
            assert (await s.execute(text("SELECT count(*) FROM users WHERE email='scheduler@example.com'"))).scalar_one() == 0
            status = (
                await s.execute(text("SELECT status FROM data_requests WHERE kind='erasure' ORDER BY requested_at DESC LIMIT 1"))
            ).scalar_one()
            assert status == "completed"

    assert not scheduler.running  # the lifespan stopped it on the way out


async def test_disabled_scheduler_never_starts(client: httpx.AsyncClient, app, mailer) -> None:  # type: ignore[no-untyped-def]
    app.state.settings.purge_scheduler_enabled = False
    async with app.router.lifespan_context(app):
        assert app.state.purge_scheduler is None


async def test_a_not_yet_due_erasure_is_left_alone(client: httpx.AsyncClient, app, mailer) -> None:  # type: ignore[no-untyped-def]
    ha = await user(client, mailer, "notdue@example.com")
    app.state.settings.erasure_cooling_days = 7  # default cooling-off: not due yet
    await client.post(f"{API}/users/me/erasure-request", headers=ha, json={"password": PASSWORD})

    async with app.router.lifespan_context(app):
        for _ in range(20):
            await asyncio.sleep(0.01)
        async with app.state.sessionmaker() as s:
            n = await s.execute(text("SELECT count(*) FROM users WHERE email='notdue@example.com'"))
            assert n.scalar_one() == 1  # still there: the account was not due
