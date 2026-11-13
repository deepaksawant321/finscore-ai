from datetime import date, timedelta

import httpx
from sqlalchemy import text

from app.config import Settings
from app.infra.crypto import generate_key
from app.main import create_app
from tests.integration.test_coach import with_score
from tests.integration.test_intelligence import auth_client

API = "/api/v1"


async def sim(client: httpx.AsyncClient, h: dict[str, str], body: dict) -> httpx.Response:  # type: ignore[type-arg]
    return await client.post(f"{API}/simulations", headers=h, json=body)


async def test_invest_simulation_needs_the_users_own_return_and_matches_the_engine(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await auth_client(client, mailer)
    no_rate = await sim(client, h, {"kind": "invest", "monthly_amount": "10000", "years": 10})
    assert no_rate.status_code == 422  # no default return exists
    r = await sim(client, h, {"kind": "invest", "monthly_amount": "10000", "years": 10, "return_pct": "12", "inflation_pct": "6"})
    assert r.status_code == 201
    j = r.json()
    assert j["official"] is True and j["watermark"] is None
    assert j["result"]["total_contributed"] == "1200000.00" and j["result"]["final_value"] == "2300386.89"
    assert len(j["result"]["schedule"]) == 10 and "Projection, not a guarantee" in " ".join(j["result"]["assumptions"])
    assert (await sim(client, h, {"kind": "invest", "monthly_amount": "1", "years": 10, "return_pct": "50"})).status_code == 422
    again = await sim(
        client, h, {"kind": "invest", "monthly_amount": "10000", "years": 10, "return_pct": "12", "inflation_pct": "6"}
    )
    assert again.json()["result"] == j["result"]  # reproducible


async def test_score_what_if_changes_nothing_that_is_stored(client: httpx.AsyncClient, app, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await auth_client(client, mailer)
    for k, v in (("annual_income", "2000000"), ("monthly_expenses", "150000")):  # saves 10% of income: below the demo scale's top
        await client.patch(f"{API}/profile/facts/{k}", headers=h, json={"value": v})
    await client.post(f"{API}/score/compute", headers=h)
    before_facts = (await client.get(f"{API}/memory/facts", headers=h)).json()
    before_hist = (await client.get(f"{API}/score/history", headers=h)).json()
    r = await sim(client, h, {"kind": "score_what_if", "overrides": {"monthly_expenses": "100000"}})
    assert r.status_code == 201, r.text
    j = r.json()
    res = j["result"]
    assert j["official"] is False and "DEMO" in j["watermark"]
    assert float(res["delta"]) > 0 and float(res["scenario"]["overall"]) > float(res["baseline"]["overall"])
    assert any(c["id"] == "SP-01" and float(c["points_change"]) > 0 for c in res["pillar_changes"])
    # nothing was saved: same facts, same score history
    assert (await client.get(f"{API}/memory/facts", headers=h)).json() == before_facts
    assert (await client.get(f"{API}/score/history", headers=h)).json() == before_hist
    worse = (await sim(client, h, {"kind": "score_what_if", "overrides": {"monthly_expenses": "165000"}})).json()["result"]
    assert float(worse["delta"]) < 0
    # spending less keeps raising the score until the demo savings scale is full
    full = (await sim(client, h, {"kind": "score_what_if", "overrides": {"monthly_expenses": "50000"}})).json()["result"]
    assert float(full["delta"]) > 0


async def test_adding_a_perfect_pillar_to_a_perfect_score_changes_nothing_but_is_listed(
    client: httpx.AsyncClient, mailer
) -> None:  # type: ignore[no-untyped-def]
    h = await with_score(client, mailer)  # savings rate already above the demo scale's top
    res = (await sim(client, h, {"kind": "score_what_if", "overrides": {"liquid_assets": "600000"}})).json()["result"]
    assert float(res["delta"]) == 0
    assert any(c["id"] == "SP-02" and c["score_before"] is None for c in res["pillar_changes"])


async def test_score_what_if_validates_fields(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await with_score(client, mailer)
    assert (await sim(client, h, {"kind": "score_what_if", "overrides": {"nonsense": "1"}})).status_code == 422
    assert (await sim(client, h, {"kind": "score_what_if", "overrides": {"monthly_expenses": "-5"}})).status_code == 422
    assert (await sim(client, h, {"kind": "score_what_if", "overrides": {}})).status_code == 422
    h2 = await auth_client(client, mailer, "empty@example.com")  # no facts at all
    r = await sim(client, h2, {"kind": "score_what_if", "overrides": {"monthly_expenses": "1000"}})
    assert r.status_code == 422 and r.json()["code"] == "insufficient_data"


async def test_goal_what_if_matches_the_funding_view_and_leaves_the_goal_alone(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await auth_client(client, mailer)
    target = (date.today() + timedelta(days=365 * 5)).isoformat()
    g = (
        await client.post(
            f"{API}/goals",
            headers=h,
            json={
                "name": "House",
                "target_amount_today": "2500000",
                "target_date": target,
                "priority": "important",
                "current_funding": "200000",
                "monthly_funding": "10000",
            },
        )
    ).json()
    r = await sim(
        client,
        h,
        {"kind": "goal_what_if", "goal_id": g["id"], "new_monthly_funding": "30000", "return_pct": "8", "inflation_pct": "6"},
    )
    assert r.status_code == 201, r.text
    res = r.json()["result"]
    f = (
        await client.get(f"{API}/goals/{g['id']}/funding", headers=h, params={"assumed_return_pct": "8", "inflation_pct": "6"})
    ).json()
    assert res["before"]["projected_total"] == f["projected_total"] and res["before"]["shortfall"] == f["shortfall"]
    assert float(res["after"]["projected_total"]) > float(res["before"]["projected_total"]) and float(res["projected_change"]) > 0
    assert (await client.get(f"{API}/goals/{g['id']}", headers=h)).json()[
        "monthly_funding"
    ] == "10000.00"  # stored goal untouched
    missing = await sim(
        client, h, {"kind": "goal_what_if", "goal_id": g["id"], "new_monthly_funding": "30000", "return_pct": "8"}
    )
    assert missing.status_code == 422  # inflation assumption is required too


async def test_simulations_are_private_listed_and_exported(client: httpx.AsyncClient, app, mailer) -> None:  # type: ignore[no-untyped-def]
    ha = await auth_client(client, mailer, "a@example.com")
    sid = (await sim(client, ha, {"kind": "invest", "monthly_amount": "5000", "years": 5, "return_pct": "7"})).json()["id"]
    hb = await auth_client(client, mailer, "b@example.com")
    assert (await client.get(f"{API}/simulations/{sid}", headers=hb)).status_code == 404
    assert (await client.get(f"{API}/simulations", headers=hb)).json() == []
    assert [x["id"] for x in (await client.get(f"{API}/simulations", headers=ha)).json()] == [sid]
    export = (await client.get(f"{API}/users/me/data-export", headers=ha)).json()
    assert export["simulations"][0]["kind"] == "invest"
    async with app.state.sessionmaker() as s:  # encrypted at rest
        raw = (await s.execute(text("SELECT scenario FROM simulations WHERE id=:i"), {"i": sid})).scalar_one()
    assert "monthly_amount" not in raw


async def test_score_what_if_is_blocked_in_production_until_rules_are_approved(
    client: httpx.AsyncClient, app, mailer, settings: Settings
) -> None:  # type: ignore[no-untyped-def]
    h = await with_score(client, mailer)
    prod = Settings(
        _env_file=None,
        env="production",
        database_url="x",
        jwt_secret=app.state.settings.jwt_secret,
        cookie_secure=True,
        data_encryption_key=generate_key(),
    )  # type: ignore[arg-type]
    papp = create_app(prod)
    papp.state.sessionmaker = app.state.sessionmaker
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=papp), base_url="http://test") as pc:
        r = await pc.post(
            f"{API}/simulations", headers=h, json={"kind": "score_what_if", "overrides": {"monthly_expenses": "50000"}}
        )
        ok = await pc.post(
            f"{API}/simulations", headers=h, json={"kind": "invest", "monthly_amount": "1000", "years": 3, "return_pct": "6"}
        )
    assert r.status_code == 503 and r.json()["code"] == "rulebook_not_approved"
    assert ok.status_code == 201  # assumption-driven maths does not depend on the unapproved rules
