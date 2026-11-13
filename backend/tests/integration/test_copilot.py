from datetime import date, timedelta

import httpx
from sqlalchemy import text

from tests.integration.test_actions import by_key, weak_user
from tests.integration.test_actions import refresh as refresh_actions
from tests.integration.test_intelligence import auth_client

API = "/api/v1"
# income 20L/yr (1,66,667/mo), spends 1 lakh, 2 lakh liquid, 60k EMI, no insurance -> plenty of margin today
COMFORTABLE = {
    "annual_income": "2000000", "monthly_expenses": "100000", "liquid_assets": "200000", "monthly_emi_total": "20000",
    "has_health_insurance": "false", "has_term_insurance": "false",
}  # fmt: skip
# income 12L/yr (1,00,000/mo), spends 1,40,000 (negative savings rate) with a 50k EMI: reaching 30% savings needs a
# big cut, and even after that cut the EMI alone still outstrips income -> a real-world "this helps, but isn't enough"
STRAINED = {
    "annual_income": "1200000", "monthly_expenses": "140000", "liquid_assets": "10000", "monthly_emi_total": "50000",
    "has_health_insurance": "false", "has_term_insurance": "false",
}  # fmt: skip


async def check_action(client: httpx.AsyncClient, h: dict[str, str], aid: str) -> httpx.Response:
    return await client.post(f"{API}/copilot/actions/{aid}/check", headers=h)


async def check_goal(client: httpx.AsyncClient, h: dict[str, str], body: dict) -> httpx.Response:  # type: ignore[type-arg]
    return await client.post(f"{API}/copilot/goals/check", headers=h, json=body)


def codes(report: dict) -> list[str]:  # type: ignore[type-arg]
    return [f["code"] for f in report["findings"]]


async def test_insurance_action_is_a_hand_off_with_no_misattributed_affordability_claim(
    client: httpx.AsyncClient, mailer
) -> None:  # type: ignore[no-untyped-def]
    """Buying insurance has no modelled monthly cost, so the Copilot must not claim an affordability verdict for it —
    even for a user who is already over budget for reasons that have nothing to do with this decision."""
    h = await weak_user(client, mailer)
    ins = by_key(await refresh_actions(client, h))["arrange_health_insurance"]
    r = await check_action(client, h, ins["id"])
    assert r.status_code == 200, r.text
    rep = r.json()
    assert rep["context"] == "action:arrange_health_insurance" and rep["needs_hand_off"] is True
    assert codes(rep) == ["product_choice"]  # no affordability finding attached to a decision that didn't cause it
    product = rep["findings"][0]
    assert product["hand_off"] is True and "can't make for you" in product["message"]


async def test_raise_savings_rate_flags_a_large_cut(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await auth_client(client, mailer)
    for k, v in STRAINED.items():
        await client.patch(f"{API}/profile/facts/{k}", headers=h, json={"value": v})
    acts = by_key(await refresh_actions(client, h))
    r = await check_action(client, h, acts["raise_savings_rate"]["id"])
    assert r.status_code == 200
    rep = r.json()
    assert "large_cut" in codes(rep) and rep["needs_hand_off"] is False  # a budgeting note, not a hand-off


async def test_lower_emi_action_always_points_to_the_lender(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await weak_user(client, mailer)
    acts = by_key(await refresh_actions(client, h))
    rep = (await check_action(client, h, acts["lower_emi_burden"]["id"])).json()
    assert "needs_lender" in codes(rep)


async def test_emergency_fund_action_explains_the_target_is_not_immediate(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await weak_user(client, mailer)
    acts = by_key(await refresh_actions(client, h))
    rep = (await check_action(client, h, acts["build_emergency_fund"]["id"])).json()
    assert codes(rep) == ["target_not_immediate"]  # a lump-sum reallocation carries no affordability verdict either


async def test_a_users_existing_deficit_is_not_blamed_on_an_unrelated_action(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    """Regression: this user is already over budget before taking any action. A reallocation (build_emergency_fund) or a
    flag change (arrange_health_insurance) must not surface a 'this would commit X a month' finding about it."""
    h = await auth_client(client, mailer)
    for k, v in STRAINED.items():
        await client.patch(f"{API}/profile/facts/{k}", headers=h, json={"value": v})
    acts = by_key(await refresh_actions(client, h))
    for key in ("build_emergency_fund", "arrange_health_insurance"):
        rep = (await check_action(client, h, acts[key]["id"])).json()
        assert not any(f["code"] in ("deficit", "thin_margin", "affordable") for f in rep["findings"])


async def test_an_action_can_help_and_still_leave_a_deficit(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    """Raising the savings rate always improves cash flow, but if the EMI alone already exceeds the 30% target it
    helps toward, the Copilot still says so rather than reporting a false all-clear."""
    h = await auth_client(client, mailer)
    for k, v in STRAINED.items():
        await client.patch(f"{API}/profile/facts/{k}", headers=h, json={"value": v})
    acts = by_key(await refresh_actions(client, h))
    rep = (await check_action(client, h, acts["raise_savings_rate"]["id"])).json()
    deficit = next((f for f in rep["findings"] if f["code"] == "deficit"), None)
    assert deficit is not None and deficit["level"] == "blocker"
    assert "large_cut" in codes(rep)  # both findings can fire together


async def test_unknown_action_is_rejected(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await auth_client(client, mailer)
    import uuid

    assert (await check_action(client, h, str(uuid.uuid4()))).status_code == 404


async def test_goal_check_without_a_goal_id_checks_a_not_yet_created_goal(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await auth_client(client, mailer)
    for k, v in COMFORTABLE.items():
        await client.patch(f"{API}/profile/facts/{k}", headers=h, json={"value": v})
    ok = (await check_goal(client, h, {"new_monthly_funding": "10000"})).json()
    assert ok["context"] == "goal:new" and "affordable" in codes(ok)
    big = (await check_goal(client, h, {"new_monthly_funding": "500000"})).json()
    assert "deficit" in codes(big)


async def test_goal_check_excludes_the_goals_own_current_funding(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await auth_client(client, mailer)
    for k, v in COMFORTABLE.items():
        await client.patch(f"{API}/profile/facts/{k}", headers=h, json={"value": v})
    target = (date.today() + timedelta(days=365 * 3)).isoformat()
    g = (
        await client.post(
            f"{API}/goals",
            headers=h,
            json={
                "name": "Car",
                "target_amount_today": "500000",
                "target_date": target,
                "priority": "important",
                "current_funding": "0",
                "monthly_funding": "40000",
            },
        )
    ).json()
    same = (await check_goal(client, h, {"goal_id": g["id"], "new_monthly_funding": "40000"})).json()
    assert same["context"] == f"goal:{g['id']}" and "affordable" in codes(same) or "thin_margin" in codes(same)
    raised_to_deficit = (await check_goal(client, h, {"goal_id": g["id"], "new_monthly_funding": "500000"})).json()
    assert "deficit" in codes(raised_to_deficit)
    unknown_goal_id = "00000000-0000-0000-0000-000000000000"
    assert (await check_goal(client, h, {"goal_id": unknown_goal_id, "new_monthly_funding": "1000"})).status_code == 404


async def test_check_is_audited_without_storing_amounts_and_is_private(client: httpx.AsyncClient, app, mailer) -> None:  # type: ignore[no-untyped-def]
    ha = await weak_user(client, mailer, "a@example.com")
    for k, v in COMFORTABLE.items():
        await client.patch(f"{API}/profile/facts/{k}", headers=ha, json={"value": v})
    acts = by_key(await refresh_actions(client, ha))
    aid = acts["arrange_health_insurance"]["id"]
    await check_action(client, ha, aid)
    async with app.state.sessionmaker() as s:
        rows = (await s.execute(text("SELECT meta FROM audit_log WHERE action='copilot.check'"))).all()
    assert rows and rows[0][0]["hand_off"] == "True" and "message" not in rows[0][0] and "amount" not in str(rows[0][0])
    hb = await auth_client(client, mailer, "b@example.com")
    assert (await check_action(client, hb, aid)).status_code == 404


async def test_never_executes_anything_only_reports(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    """Read-only/hand-off only: a check never changes the action's state, params or the user's facts/goals."""
    h = await weak_user(client, mailer)
    for k, v in COMFORTABLE.items():
        await client.patch(f"{API}/profile/facts/{k}", headers=h, json={"value": v})
    before = by_key(await refresh_actions(client, h))
    before_facts = (await client.get(f"{API}/memory/facts", headers=h)).json()
    await check_action(client, h, before["arrange_health_insurance"]["id"])
    after = by_key((await client.get(f"{API}/actions", headers=h)).json())
    assert after["arrange_health_insurance"]["state"] == before["arrange_health_insurance"]["state"] == "suggested"
    assert (await client.get(f"{API}/memory/facts", headers=h)).json() == before_facts
