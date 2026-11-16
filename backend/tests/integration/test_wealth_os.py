import asyncio
from datetime import date, timedelta

import httpx
import pytest
from sqlalchemy import select, text

from app.domains.events import bus, dispatcher
from app.domains.events.models import DomainEvent
from tests.integration.test_actions import weak_user
from tests.integration.test_intelligence import auth_client

API = "/api/v1"


async def pending(app, event_type: str | None = None) -> list[DomainEvent]:  # type: ignore[no-untyped-def]
    async with app.state.sessionmaker() as s:
        q = select(DomainEvent).where(DomainEvent.dispatched_at.is_(None))
        if event_type:
            q = q.where(DomainEvent.event_type == event_type)
        return list((await s.execute(q)).scalars().all())


async def all_events(app, event_type: str | None = None) -> list[DomainEvent]:  # type: ignore[no-untyped-def]
    async with app.state.sessionmaker() as s:
        q = select(DomainEvent)
        if event_type:
            q = q.where(DomainEvent.event_type == event_type)
        return list((await s.execute(q)).scalars().all())


# ======================= publishing =======================
async def test_recording_a_fact_publishes_a_fact_changed_event_only_on_a_real_change(
    client: httpx.AsyncClient, app, mailer
) -> None:  # type: ignore[no-untyped-def]
    h = await auth_client(client, mailer)
    await client.patch(f"{API}/profile/facts/annual_income", headers=h, json={"value": "2000000"})
    evs = await pending(app, bus.FACT_CHANGED)
    assert [e.payload["field_key"] for e in evs] == ["annual_income"]
    # same value again: a no-op, no second event
    await client.patch(f"{API}/profile/facts/annual_income", headers=h, json={"value": "2000000"})
    assert len(await pending(app, bus.FACT_CHANGED)) == 1


async def test_score_computed_is_published_only_for_a_genuinely_new_run(client: httpx.AsyncClient, app, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await weak_user(client, mailer)
    r1 = await client.post(f"{API}/score/compute", headers=h)
    assert r1.status_code == 200
    r2 = await client.post(f"{API}/score/compute", headers=h)  # same inputs: idempotent, returns the same run
    assert r2.status_code == 200 and r2.json()["id"] == r1.json()["id"]
    assert len(await all_events(app, bus.SCORE_COMPUTED)) == 1


async def test_goal_lifecycle_publishes_created_updated_deleted(client: httpx.AsyncClient, app, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await auth_client(client, mailer)
    target = (date.today() + timedelta(days=365)).isoformat()
    g = (
        await client.post(
            f"{API}/goals", headers=h, json={"name": "Trip", "target_amount_today": "100000", "target_date": target}
        )
    ).json()
    await client.patch(f"{API}/goals/{g['id']}", headers=h, json={"name": "Big trip"})
    await client.delete(f"{API}/goals/{g['id']}", headers=h)
    evs = sorted(await all_events(app, bus.GOAL_UPDATED), key=lambda e: e.occurred_at)
    assert [e.payload["kind"] for e in evs] == ["created", "updated", "deleted"]
    assert all(e.payload["goal_id"] == g["id"] for e in evs)


async def test_action_verified_is_published_once(client: httpx.AsyncClient, app, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await weak_user(client, mailer)
    await client.post(f"{API}/score/compute", headers=h)
    acts = (await client.post(f"{API}/actions/refresh", headers=h)).json()
    ef = next(a for a in acts if a["key"] == "build_emergency_fund")
    await client.post(f"{API}/actions/{ef['id']}/accept", headers=h)
    await client.post(f"{API}/actions/{ef['id']}/complete", headers=h)  # not yet true in the numbers
    assert await all_events(app, bus.ACTION_VERIFIED) == []
    await client.patch(f"{API}/profile/facts/liquid_assets", headers=h, json={"value": "900000"})
    await client.post(f"{API}/actions/refresh", headers=h)  # this is what actually verifies it
    evs = await all_events(app, bus.ACTION_VERIFIED)
    assert len(evs) == 1 and evs[0].payload == {"action_id": ef["id"], "catalog_key": "build_emergency_fund"}
    await client.post(f"{API}/actions/refresh", headers=h)  # verified actions are not re-processed
    assert len(await all_events(app, bus.ACTION_VERIFIED)) == 1


# ======================= dispatch =======================
async def test_dispatch_pending_coordinates_actions_without_the_page_ever_calling_refresh(
    client: httpx.AsyncClient, app, mailer
) -> None:  # type: ignore[no-untyped-def]
    """The actual gap this closes: previously Actions only recomputed when the user opened that page. Here nothing
    ever calls POST /actions/refresh — only facts are confirmed and the dispatcher is driven directly."""
    h = await weak_user(client, mailer)
    assert (await client.get(f"{API}/actions", headers=h)).json() == []  # nothing suggested yet: no refresh has run

    n = await dispatcher.dispatch_pending(app.state.sessionmaker, app.state.settings)
    assert n >= 1
    assert await pending(app) == []  # everything that was pending is now dispatched
    acts = (await client.get(f"{API}/actions", headers=h)).json()
    assert acts and {a["key"] for a in acts} >= {"build_emergency_fund", "arrange_health_insurance"}


async def test_dispatch_pending_is_idempotent(client: httpx.AsyncClient, app, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await weak_user(client, mailer)
    await dispatcher.dispatch_pending(app.state.sessionmaker, app.state.settings)
    before = (await client.get(f"{API}/actions", headers=h)).json()
    assert await dispatcher.dispatch_pending(app.state.sessionmaker, app.state.settings) == 0  # nothing left pending
    assert (await client.get(f"{API}/actions", headers=h)).json() == before  # calling it again changed nothing


async def test_a_failing_handler_retries_then_gives_up_without_blocking_other_events(
    client: httpx.AsyncClient, app, mailer
) -> None:  # type: ignore[no-untyped-def]
    app.state.settings.wealth_os_max_attempts = 2
    ha = await auth_client(client, mailer, "a@example.com")
    good_user = (await client.get(f"{API}/users/me", headers=ha)).json()["id"]
    await client.patch(
        f"{API}/profile/facts/annual_income", headers=ha, json={"value": "1000000"}
    )  # a healthy event, for isolation
    hb = await auth_client(client, mailer, "b@example.com")
    bad_user = (await client.get(f"{API}/users/me", headers=hb)).json()["id"]
    await client.patch(f"{API}/profile/facts/annual_income", headers=hb, json={"value": "1000000"})  # the one that will fail

    async def boom(session, settings, event) -> None:  # type: ignore[no-untyped-def]
        if str(event.user_id) == bad_user:
            raise RuntimeError("simulated failure")

    original = dispatcher.HANDLERS[bus.FACT_CHANGED]
    dispatcher.HANDLERS[bus.FACT_CHANGED] = [boom]
    try:
        await dispatcher.dispatch_pending(app.state.sessionmaker, app.state.settings)
        async with app.state.sessionmaker() as s:
            bad = (await s.execute(select(DomainEvent).where(DomainEvent.user_id == bad_user))).scalars().one()
            good = (await s.execute(select(DomainEvent).where(DomainEvent.user_id == good_user))).scalars().one()
            assert bad.dispatched_at is None and bad.attempts == 1 and bad.last_error == "RuntimeError"
            assert good.dispatched_at is not None  # one event failing never blocks another's dispatch
        await dispatcher.dispatch_pending(app.state.sessionmaker, app.state.settings)  # second (final) attempt
        async with app.state.sessionmaker() as s:
            bad = (await s.execute(select(DomainEvent).where(DomainEvent.user_id == bad_user))).scalars().one()
            assert bad.dispatched_at is not None and bad.attempts == 2  # given up, not stuck forever
    finally:
        dispatcher.HANDLERS[bus.FACT_CHANGED] = original


async def test_the_scheduler_coordinates_actions_in_the_background_without_the_cli_or_a_manual_refresh(
    client: httpx.AsyncClient, app, mailer
) -> None:  # type: ignore[no-untyped-def]
    """End-to-end: drives the real app lifespan so the Wealth OS scheduler itself (not a direct dispatch_pending call)
    picks up a fact change made before the app even started and suggests an action for it, with nothing else asked."""
    h = await weak_user(client, mailer)
    app.state.settings.wealth_os_interval_seconds = 60  # cadence does not matter: the first run fires on start

    async with app.router.lifespan_context(app):
        wos = app.state.wealth_os_scheduler
        assert wos is not None and wos.running
        for _ in range(200):
            await asyncio.sleep(0.01)
            acts = (await client.get(f"{API}/actions", headers=h)).json()
            if acts:
                break
        else:
            pytest.fail("the Wealth OS scheduler did not coordinate actions in time")
        assert {a["key"] for a in acts} >= {"build_emergency_fund"}

    assert not wos.running  # the lifespan stopped it on the way out


async def test_disabled_wealth_os_never_starts(client: httpx.AsyncClient, app, mailer) -> None:  # type: ignore[no-untyped-def]
    app.state.settings.wealth_os_enabled = False
    async with app.router.lifespan_context(app):
        assert app.state.wealth_os_scheduler is None


async def test_events_are_private_and_hold_no_amounts_or_fact_values(client: httpx.AsyncClient, app, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await auth_client(client, mailer)
    await client.patch(f"{API}/profile/facts/annual_income", headers=h, json={"value": "7777777"})
    async with app.state.sessionmaker() as s:
        rows = (await s.execute(text("SELECT payload::text FROM domain_events"))).scalars().all()
    blob = " ".join(rows)
    assert "7777777" not in blob
