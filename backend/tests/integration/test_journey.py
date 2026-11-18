import httpx
from sqlalchemy import text

from tests.integration.test_intelligence import auth_client

API = "/api/v1"
SNAPSHOT = [  # (card, value, mix)
    ("age", "34", None), ("annual_income", "150000", None), ("monthly_expenses", "70000", None),
    ("monthly_emi_total", "0", None), ("monthly_investment", "10000", None), ("savings_mix", "800000", "balanced"),
    ("other_assets", "0", None),
]  # fmt: skip


async def answer(
    client: httpx.AsyncClient, h: dict[str, str], card: str, value: str | None, mix: str | None = None
) -> httpx.Response:
    return await client.post(f"{API}/journey/answer", headers=h, json={"card": card, "value": value, "mix": mix})


async def journey(client: httpx.AsyncClient, h: dict[str, str], **params: str) -> dict:  # type: ignore[type-arg]
    r = await client.get(f"{API}/journey", headers=h, params=params)
    assert r.status_code == 200, r.text
    return r.json()  # type: ignore[no-any-return]


async def snapshot(client: httpx.AsyncClient, h: dict[str, str]) -> list[dict]:  # type: ignore[type-arg]
    out = []
    for card, value, mix in SNAPSHOT:
        r = await answer(client, h, card, value, mix)
        assert r.status_code == 200, r.text
        out.append(r.json())
    return out


async def test_snapshot_chapter_reveals_the_score_with_facts_points_and_a_badge(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await auth_client(client, mailer)
    j = await journey(client, h)
    assert j["next"]["key"] == "age" and j["measured"] == "0.0000" and j["progress"]["points"] == 0
    assert [c["unlocked"] for c in j["chapters"]] == [True, False, False, False, False, False]
    assert (await answer(client, h, "dependants", "2")).json()["code"] == "chapter_locked"  # score first

    turns = await snapshot(client, h)
    measured = [float(t["measured_after"]) for t in turns]
    assert measured == sorted(measured) and measured[-1] >= 0.6  # the meter only goes up, and ends past the verdict threshold
    assert turns[0]["next"]["key"] == "annual_income" and turns[1]["next"]["per_month"] is False
    assert "/10 for your age group" in turns[2]["insight"]  # spending -> cash flow band, from the engine
    assert all(t["chapter_complete"] is False and t["score"] is None for t in turns[:-1])
    last = turns[-1]
    assert last["chapter_complete"] is True and last["score"]["early_estimate"] is False and last["next"] is None
    assert last["points_awarded"] == 10 + 50 and [b["key"] for b in last["new_badges"]] == ["first_score"]
    # the loans card never appeared: no EMIs, so it was worked out
    assert all(t["next"] is None or t["next"]["key"] != "loans_outstanding" for t in turns)

    j = await journey(client, h)
    assert all(c["unlocked"] for c in j["chapters"]) and j["chapters"][0]["complete"]
    assert j["progress"]["points"] == 7 * 10 + 50 and j["progress"]["active_weeks"] == 1 and j["progress"]["active_this_week"]
    facts = {f["field_key"]: f for f in (await client.get(f"{API}/memory/facts", headers=h)).json()}
    assert facts["annual_income"]["value"] == "1800000.00"  # asked per month, stored per year
    assert facts["equity_holdings"]["source_type"] == "ESTIMATED" and facts["retirement_age"]["source_type"] == "ESTIMATED"


async def test_assumptions_can_be_kept_and_points_never_change_the_score(client: httpx.AsyncClient, app, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await auth_client(client, mailer)
    await snapshot(client, h)
    nxt = (await journey(client, h, chapter="future", skipped="pending_goals"))["next"]
    assert nxt["key"] == "retirement_age" and nxt["assumed_value"] == "60"
    kept = (await client.post(f"{API}/journey/keep", headers=h, json={"card": "retirement_age"})).json()
    assert kept["insight"].startswith("Kept") and kept["points_awarded"] == 5
    assert (await client.post(f"{API}/journey/keep", headers=h, json={"card": "retirement_age"})).status_code == 409
    again = await answer(client, h, "retirement_age", "60")  # re-stating the same value earns nothing
    assert again.json()["points_awarded"] == 0

    before = (await client.post(f"{API}/score/matrix/compute", headers=h)).json()
    async with app.state.sessionmaker() as s:
        await s.execute(text('UPDATE user_progress SET points = 99999, badges = \'[{"key": "full_picture"}]\''))
        await s.commit()
    after = (await client.post(f"{API}/score/matrix/compute", headers=h)).json()
    assert after["overall"] == before["overall"] and after["input_digest"] == before["input_digest"]


async def test_cards_that_do_not_apply_are_skipped(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await auth_client(client, mailer)
    await snapshot(client, h)
    seen = []
    for card, value in (("dependants", "0"), ("kids", "0"), ("health_cover_amount", "500000"), ("life_cover_amount", "0")):
        r = (await answer(client, h, card, value)).json()
        seen.append(r["next"]["key"] if r["next"] else None)
    assert "kids_goal_planned" not in seen and "has_term_insurance" not in seen  # no kids, no life cover
    assert r["chapter_complete"] is True and any(b["key"] == "protected" for b in r["new_badges"])
    assert "does not apply" in (await answer(client, h, "kids", "0")).json()["insight"]  # the kids area is left out
    # with EMIs, the loans card appears in Snapshot
    r = (await answer(client, h, "monthly_emi_total", "20000")).json()
    assert r["next"]["key"] == "loans_outstanding" and r["next"]["chips"]


async def test_skip_and_unsure_move_on_without_saving(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await auth_client(client, mailer)
    await answer(client, h, "age", "40")
    await answer(client, h, "annual_income", "100000")
    j = await journey(client, h, skipped="monthly_expenses")
    assert j["next"]["key"] == "monthly_emi_total"  # put off for now, comes back later
    assert (await journey(client, h))["next"]["key"] == "monthly_expenses"
    bad = await answer(client, h, "savings_mix", "500000")  # a total without the mix
    assert bad.status_code == 422


async def test_rewards_can_be_switched_off_and_the_weekly_checkin_counts_once(client: httpx.AsyncClient, app, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await auth_client(client, mailer)
    await snapshot(client, h)
    assert (await journey(client, h))["checkin_due"] is False  # just active this week: nothing to check in about
    async with app.state.sessionmaker() as s:  # a new week starts with no activity yet
        await s.execute(text("UPDATE user_progress SET last_active_week = '2020-W01'"))
        await s.commit()
    j = await journey(client, h)
    assert j["checkin_due"] is True
    c = await client.post(f"{API}/journey/checkin", headers=h)
    assert c.json()["points_awarded"] == 10
    assert (await client.post(f"{API}/journey/checkin", headers=h)).status_code == 409
    assert (await journey(client, h))["checkin_due"] is False

    off = (await client.put(f"{API}/journey/settings", headers=h, json={"rewards_enabled": False})).json()
    assert off["rewards_enabled"] is False and off["progress"] is None
    r = (await answer(client, h, "dependants", "1")).json()
    assert r["points_awarded"] is None and r["new_badges"] == [] and r["insight"]  # the facts stay, the game goes away
    export = (await client.get(f"{API}/users/me/data-export", headers=h)).json()
    assert export["money_map"]["rewards_enabled"] is False and export["money_map"]["points"] == 7 * 10 + 50 + 10
