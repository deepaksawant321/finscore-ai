"""First-party product analytics (audit Phase 1 item 1.11): allow-listed events, no personal data, staff-only funnel."""

import httpx
from sqlalchemy import text

from tests.conftest import login, register_verified

API = "/api/v1"


async def events(app) -> list[dict]:  # type: ignore[no-untyped-def,type-arg]
    async with app.state.sessionmaker() as s:
        rows = (
            await s.execute(text("SELECT name, user_id, anon_id, path, props FROM product_events ORDER BY occurred_at"))
        ).all()
    return [dict(r._mapping) for r in rows]  # noqa: SLF001


async def test_anonymous_and_signed_in_events_are_recorded_without_personal_data(client: httpx.AsyncClient, app, mailer) -> None:  # type: ignore[no-untyped-def]
    r = await client.post(f"{API}/events", json={"name": "landing_view", "anon_id": "b-123", "path": "/?utm=x"})
    assert r.status_code == 204
    await register_verified(client, mailer)
    h = {"Authorization": f"Bearer {(await login(client)).json()['access_token']}"}
    props = {"card": "monthly_expenses", "code": "free text with spaces", "email": "a@example.com"}
    await client.post(f"{API}/events", headers=h, json={"name": "journey_answer", "props": props, "path": "/app/journey"})
    await client.post(f"{API}/events", json={"name": "made_up_event"})  # dropped
    await client.post(f"{API}/events", json={"name": "verify_done", "path": "/verify-email?token=secret"})
    got = await events(app)
    assert [e["name"] for e in got] == ["landing_view", "journey_answer", "verify_done"]
    assert got[0]["user_id"] is None and got[0]["anon_id"] == "b-123" and got[0]["path"] == "/"
    assert got[1]["user_id"] is not None and got[1]["props"] == {"card": "monthly_expenses"}  # free text and unknown keys dropped
    assert got[2]["path"] == "/verify-email"  # tokens in query strings are never stored


async def test_funnel_is_staff_only_and_counts_people(client: httpx.AsyncClient, app, mailer) -> None:  # type: ignore[no-untyped-def]
    for anon in ("a1", "a1", "a2"):
        await client.post(f"{API}/events", json={"name": "landing_view", "anon_id": anon})
    await register_verified(client, mailer)
    h = {"Authorization": f"Bearer {(await login(client)).json()['access_token']}"}
    assert (await client.get(f"{API}/admin/funnel", headers=h)).status_code == 403
    async with app.state.sessionmaker() as s:
        await s.execute(
            text("INSERT INTO user_roles (user_id, role) SELECT id, 'support' FROM users WHERE email='a@example.com'")
        )
        await s.commit()
    rows = (await client.get(f"{API}/admin/funnel", headers=h)).json()
    assert rows[0] == {"name": "landing_view", "events": 3, "people": 2}


async def test_client_errors_are_accepted_and_events_leave_with_the_account(client: httpx.AsyncClient, app, mailer) -> None:  # type: ignore[no-untyped-def]
    assert (
        await client.post(f"{API}/client-errors", json={"message": "TypeError: x is undefined", "path": "/app"})
    ).status_code == 204
    await register_verified(client, mailer)
    h = {"Authorization": f"Bearer {(await login(client)).json()['access_token']}"}
    await client.post(f"{API}/events", headers=h, json={"name": "home_view"})
    export = (await client.get(f"{API}/users/me/data-export", headers=h)).json()
    assert [u["event"] for u in export["usage_events"]] == ["home_view"]
    async with app.state.sessionmaker() as s:
        await s.execute(text("DELETE FROM users WHERE email='a@example.com'"))
        await s.commit()
    assert await events(app) == []  # deleted with the account (ON DELETE CASCADE)
