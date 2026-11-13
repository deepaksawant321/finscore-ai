from datetime import UTC, date, datetime, timedelta

import httpx
from sqlalchemy import text

from tests.integration.test_actions import act, by_key, weak_user
from tests.integration.test_actions import refresh as refresh_actions
from tests.integration.test_intelligence import auth_client

API = "/api/v1"


async def nudges(client: httpx.AsyncClient, h: dict[str, str]) -> list[dict]:  # type: ignore[type-arg]
    r = await client.post(f"{API}/nudges/refresh", headers=h)
    assert r.status_code == 200, r.text
    return r.json()  # type: ignore[no-any-return]


def rules(ns: list[dict]) -> list[str]:  # type: ignore[type-arg]
    return [n["rule"] for n in ns]


async def react(client: httpx.AsyncClient, h: dict[str, str], nid: str, action: str, days: int | None = None) -> httpx.Response:
    return await client.patch(f"{API}/nudges/{nid}", headers=h, json={"action": action, "days": days})


async def test_weak_profile_gets_one_next_step_and_a_data_gap_nudge_each_with_a_reason(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await weak_user(client, mailer)
    await client.post(f"{API}/score/compute", headers=h)
    await refresh_actions(client, h)
    ns = await nudges(client, h)
    assert rules(ns)[0] == "action_next" and ns[0]["priority"] == "high"  # best action first, high urgency
    assert rules(ns).count("action_next") == 1  # one action, not five
    nx = ns[0]
    assert "could change your score by about" in nx["body"] and nx["cta_path"] == "/app/actions" and nx["cta_label"]
    assert [n["id"] for n in ns] == [n["id"] for n in await nudges(client, h)]  # idempotent
    assert len(ns) <= 3  # default frequency cap


async def test_dismissed_nudges_are_never_repeated_and_the_choice_is_audited(client: httpx.AsyncClient, app, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await weak_user(client, mailer)
    await client.post(f"{API}/score/compute", headers=h)
    await refresh_actions(client, h)
    first = (await nudges(client, h))[0]
    assert (await react(client, h, first["id"], "dismiss")).json()["state"] == "dismissed"
    assert first["id"] not in [n["id"] for n in await nudges(client, h)]
    assert "action_next" not in rules(await nudges(client, h))  # same situation, no repeat after refusal
    assert (await react(client, h, first["id"], "seen")).status_code == 409  # closed
    async with app.state.sessionmaker() as s:
        rows = (await s.execute(text("SELECT meta FROM audit_log WHERE action='nudge.dismissed'"))).all()
    assert rows and rows[0][0]["rule"] == "action_next" and "body" not in rows[0][0]  # opt-out metric by rule, no content


async def test_snooze_hides_then_wakes(client: httpx.AsyncClient, app, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await weak_user(client, mailer)
    await client.post(f"{API}/score/compute", headers=h)
    await refresh_actions(client, h)
    n = (await nudges(client, h))[0]
    assert (await react(client, h, n["id"], "snooze")).status_code == 422  # duration required
    assert (await react(client, h, n["id"], "snooze", 0)).status_code == 422
    assert (await react(client, h, n["id"], "snooze", 3)).json()["state"] == "snoozed"
    assert n["id"] not in [x["id"] for x in await nudges(client, h)]
    async with app.state.sessionmaker() as s:
        await s.execute(
            text("UPDATE nudges SET snoozed_until=:t WHERE id=:i"), {"t": datetime.now(UTC) - timedelta(minutes=1), "i": n["id"]}
        )
        await s.commit()
    assert n["id"] in [x["id"] for x in await nudges(client, h)]  # woke up


async def test_preferences_mute_cap_and_disable(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await weak_user(client, mailer)
    await client.post(f"{API}/score/compute", headers=h)
    await refresh_actions(client, h)
    base = (await client.get(f"{API}/notification-prefs", headers=h)).json()
    assert base["in_app_enabled"] is True and base["max_active"] == 3 and "action_next" in base["available_rules"]

    def put(**kw):  # type: ignore[no-untyped-def]
        body = {"in_app_enabled": True, "max_active": 3, "muted_rules": [], **kw}
        return client.put(f"{API}/notification-prefs", headers=h, json=body)

    assert (await put(max_active=0)).status_code == 422 and (await put(muted_rules=["nonsense"])).status_code == 422
    assert (await put(max_active=1)).status_code == 200 and len(await nudges(client, h)) == 1  # frequency control
    await put(max_active=5, muted_rules=["action_next"])
    assert "action_next" not in rules(await nudges(client, h))  # muted types are hidden and not generated
    off = await put(in_app_enabled=False)
    assert off.json()["in_app_enabled"] is False
    assert await nudges(client, h) == [] and (await client.get(f"{API}/nudges", headers=h)).json() == []


async def test_waiting_action_goal_deadline_and_stale_fact_rules(client: httpx.AsyncClient, app, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await weak_user(client, mailer)
    await client.post(f"{API}/score/compute", headers=h)
    ef = by_key(await refresh_actions(client, h))["build_emergency_fund"]
    await act(client, h, ef["id"], "accept")
    await act(client, h, ef["id"], "complete")  # numbers do not show it yet
    soon = (date.today() + timedelta(days=20)).isoformat()
    await client.post(
        f"{API}/goals",
        headers=h,
        json={"name": "Trip", "target_amount_today": "100000", "target_date": soon, "priority": "important"},
    )
    async with app.state.sessionmaker() as s:  # age one fact beyond the window
        await s.execute(text("UPDATE facts SET valid_from = valid_from - interval '400 days' WHERE field_key='annual_income'"))
        await s.commit()
    allr = await _all(client, h, app)
    assert {"action_waiting", "goal_deadline", "stale_fact"} <= allr
    # priorities order the list: urgent goal before the waiting action before the stale-data chore
    await client.put(f"{API}/notification-prefs", headers=h, json={"in_app_enabled": True, "max_active": 10, "muted_rules": []})
    order = [n["priority"] for n in await nudges(client, h)]
    from app.domains.nudges.rules import PRIORITIES

    assert order == sorted(order, key=PRIORITIES.index)
    goal = next(n for n in await nudges(client, h) if n["rule"] == "goal_deadline")
    assert goal["priority"] == "high" and "Trip" in goal["title"] and goal["cta_path"] == "/app/goals"


async def _all(client: httpx.AsyncClient, h: dict[str, str], app) -> set[str]:  # type: ignore[no-untyped-def]
    await client.put(f"{API}/notification-prefs", headers=h, json={"in_app_enabled": True, "max_active": 10, "muted_rules": []})
    return set(rules(await nudges(client, h)))


async def test_nudge_resolves_itself_when_the_situation_changes(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await weak_user(client, mailer)
    await client.post(f"{API}/score/compute", headers=h)
    await client.put(f"{API}/notification-prefs", headers=h, json={"in_app_enabled": True, "max_active": 10, "muted_rules": []})
    ea = by_key(await refresh_actions(client, h))["arrange_health_insurance"]
    await act(client, h, ea["id"], "accept")
    await act(client, h, ea["id"], "complete")  # claimed, not yet true in the numbers
    waiting = [n for n in await nudges(client, h) if n["rule"] == "action_waiting"]
    assert len(waiting) == 1 and "health insurance" in waiting[0]["body"].lower()
    await client.patch(f"{API}/profile/facts/has_health_insurance", headers=h, json={"value": "true"})
    await refresh_actions(client, h)  # verifies the action
    assert not any(n["rule"] == "action_waiting" for n in await nudges(client, h))  # nothing left to nag about
    assert (await react(client, h, waiting[0]["id"], "dismiss")).status_code == 409  # it expired on its own


async def test_nudges_are_private(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    ha = await weak_user(client, mailer, "a@example.com")
    await client.post(f"{API}/score/compute", headers=ha)
    await refresh_actions(client, ha)
    n = (await nudges(client, ha))[0]
    hb = await auth_client(client, mailer, "b@example.com")
    assert (await react(client, hb, n["id"], "dismiss")).status_code == 404
    assert (await client.get(f"{API}/nudges", headers=hb)).json() == []
