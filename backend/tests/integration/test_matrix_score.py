"""Workbook-based FinScore endpoint: POST /api/v1/score/matrix/compute."""

import httpx
from sqlalchemy import text

from app.config import Settings
from app.domains.governance.service import verify_chain
from app.infra.crypto import generate_key
from app.main import create_app
from tests.conftest import login, register_verified

API = "/api/v1"
URL = f"{API}/score/matrix/compute"


async def auth(client: httpx.AsyncClient, mailer, email: str = "a@example.com") -> dict[str, str]:  # type: ignore[no-untyped-def]
    await register_verified(client, mailer, email)
    tok = (await login(client, email)).json()["access_token"]
    return {"Authorization": f"Bearer {tok}"}


async def put(client: httpx.AsyncClient, h: dict[str, str], key: str, value: str) -> None:
    r = await client.patch(f"{API}/profile/facts/{key}", headers=h, json={"value": value})
    assert r.status_code == 200, r.text


async def test_requires_login(client: httpx.AsyncClient) -> None:
    assert (await client.post(URL)).status_code == 401


async def test_needs_age_and_income(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await auth(client, mailer)
    r = await client.post(URL, headers=h)
    assert r.status_code == 422 and r.json()["code"] == "insufficient_data"
    await put(client, h, "annual_income", "480000")  # income but no age: the matrices cannot be read
    assert (await client.post(URL, headers=h)).status_code == 422


async def test_age_and_income_only_is_a_low_confidence_early_estimate(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await auth(client, mailer)
    await put(client, h, "age", "28")
    await put(client, h, "annual_income", "480000")
    r = await client.post(URL, headers=h)
    assert r.status_code == 200, r.text
    s = r.json()
    assert [f["id"] for f in s["factors"] if f["status"] == "scored"] == ["F06"]
    assert s["confidence"] == "0.0700" and s["early_estimate"] is True and s["message"] is None
    assert s["official"] is False and "NOT AN OFFICIAL" in s["watermark"] and "NOT OFFICIAL" in s["rule_set"]
    assert s["overall"] == "540.00"  # income band 2.5-5 lakh, age 26-30 scores 6/10; rescaled over the one scored factor


async def test_partial_profile_scores_the_known_factors_and_explains_every_one(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await auth(client, mailer)
    for k, v in {"age": "28", "annual_income": "480000", "monthly_expenses": "30000", "monthly_emi_total": "0",
                 "monthly_investment": "0", "dependants": "0", "retirement_age": "60"}.items():  # fmt: skip
        await put(client, h, k, v)
    s = (await client.post(URL, headers=h)).json()
    by = {f["id"]: f for f in s["factors"]}
    assert {i: by[i]["factor_score"] for i in ("F01", "F02", "F06", "F08", "F09", "F10")} == {
        "F01": 4, "F02": 6, "F06": 6, "F08": 9, "F09": 10, "F10": 4,
    }  # fmt: skip
    assert s["confidence"] == "0.4400" and s["early_estimate"] is True and s["message"] is None
    assert s["overall"] == "560.45"  # 900 x 246.6 / 396 points, rescaled over the six scored factors
    for f in s["factors"]:
        assert f["reason"]
        if f["status"] == "missing":
            assert f["missing_inputs"] and f["points"] is None  # never scored as zero
    assert (
        "life_cover_amount" in s["missing_inputs"] and "loans_outstanding" in s["missing_inputs"]
    )  # catalogue keys, ready to ask
    assert "life_cover" not in s["missing_inputs"] and "total_emi" not in s["missing_inputs"]
    assert any("Risk profile" in a for a in s["assumptions"]) and any("Planning age" in a for a in s["assumptions"])
    assert not any("Retirement age" in a for a in s["assumptions"])  # the user stated it


async def test_zero_surplus_and_unstated_retirement_age_are_handled(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await auth(client, mailer)
    for k, v in {"age": "40", "annual_income": "600000", "monthly_expenses": "50000"}.items():
        await put(client, h, k, v)
    s = (await client.post(URL, headers=h)).json()
    f08 = next(f for f in s["factors"] if f["id"] == "F08")
    assert f08["status"] == "scored" and f08["band"] == "More than 200%"  # no surplus: lowest band, not a crash
    assert any("Retirement age 60 assumed" in a for a in s["assumptions"])


async def test_same_facts_give_same_digest_and_a_change_gives_a_new_one(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await auth(client, mailer)
    await put(client, h, "age", "30")
    await put(client, h, "annual_income", "1200000")
    a = (await client.post(URL, headers=h)).json()
    b = (await client.post(URL, headers=h)).json()
    assert a["input_digest"] == b["input_digest"] and a["overall"] == b["overall"]
    await put(client, h, "monthly_expenses", "50000")
    c = (await client.post(URL, headers=h)).json()
    assert c["input_digest"] != a["input_digest"] and c["confidence"] > a["confidence"]


async def test_each_computation_is_audited_without_values(client: httpx.AsyncClient, app, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await auth(client, mailer)
    await put(client, h, "age", "30")
    await put(client, h, "annual_income", "1234567")
    await client.post(URL, headers=h)
    async with app.state.sessionmaker() as s:
        rows = (await s.execute(text("SELECT action, meta::text FROM audit_log WHERE action='score.matrix_computed'"))).all()
        assert len(rows) == 1
        assert "1234567" not in rows[0][1] and "matrix-0.1.0-draft" in rows[0][1]
        assert await verify_chain(s)


async def test_scores_are_private_to_the_user(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    ha = await auth(client, mailer, "a@example.com")
    hb = await auth(client, mailer, "b@example.com")
    await put(client, ha, "age", "30")
    await put(client, ha, "annual_income", "5000000")
    assert (await client.post(URL, headers=ha)).status_code == 200
    assert (await client.post(URL, headers=hb)).status_code == 422  # b has no facts: a's data is not used


async def test_blocked_in_production_until_the_rules_are_approved(client: httpx.AsyncClient, app, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await auth(client, mailer)
    await put(client, h, "age", "30")
    await put(client, h, "annual_income", "1200000")
    prod = Settings(
        _env_file=None,
        env="production",
        database_url="x",
        jwt_secret=app.state.settings.jwt_secret,
        cookie_secure=True,  # type: ignore[arg-type]
        data_encryption_key=generate_key(),  # type: ignore[arg-type]
    )
    papp = create_app(prod)
    papp.state.sessionmaker = app.state.sessionmaker
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=papp), base_url="http://test") as pc:
        r = await pc.post(URL, headers=h)
    assert r.status_code == 503 and r.json()["code"] == "rulebook_not_approved"


async def test_existing_twenty_pillar_score_is_unaffected(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await auth(client, mailer)
    await put(client, h, "annual_income", "1200000")
    await put(client, h, "monthly_expenses", "50000")
    r = await client.post(f"{API}/score/compute", headers=h)
    assert r.status_code == 200 and 300 <= float(r.json()["overall"]) <= 900


FULL = {
    "age": "35", "annual_income": "1800000", "monthly_expenses": "60000", "monthly_emi_total": "30000", "monthly_investment": "30000",
    "dependants": "2", "retirement_age": "60", "liquid_assets": "300000", "loans_outstanding": "2000000", "equity_holdings": "1500000",
    "debt_holdings": "700000", "other_assets": "3000000", "pending_goals": "2", "life_cover_amount": "10000000",
    "health_cover_amount": "1000000", "kids": "1", "kids_goal_planned": "yes", "section_80c": "150000", "section_80d": "25000",
    "life_expectancy": "85", "risk_profile": "Balanced",
}  # fmt: skip


async def test_complete_profile_scores_all_fifteen_factors_with_full_confidence(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await auth(client, mailer)
    for k, v in FULL.items():
        await put(client, h, k, v)
    s = (await client.post(URL, headers=h)).json()
    assert {f["id"]: f["factor_score"] for f in s["factors"]} == {
        "F01": 8, "F02": 6, "F03": 9, "F04": 8, "F05": 10, "F06": 8, "F07": 7, "F08": 10,
        "F09": 8, "F10": 6, "F11": 10, "F12": 10, "F13": 10, "F14": 10, "F15": 10,
    }  # fmt: skip
    assert all(f["status"] == "scored" for f in s["factors"])
    assert s["confidence"] == "1.0000" and s["early_estimate"] is False and s["missing_inputs"] == []
    assert s["overall"] == "765.90" and s["message"] == "Need to maintain the same."
    assert s["official"] is False and "NOT AN OFFICIAL" in s["watermark"]  # a full profile is still a draft rule set
    assert s["assumptions"] == ["Your liquid savings are counted together with your debt investments"]
    f05 = next(f for f in s["factors"] if f["id"] == "F05")
    assert f05["value"] == "60.0000"  # equity 15 lakh / (15 + debt 7 + liquid savings 3) lakh = 60%
    f03 = next(f for f in s["factors"] if f["id"] == "F03")
    assert f03["value"] == "55.0000"  # 15 + (7 + 3) + 30 lakh


async def test_risk_profile_changes_the_retirement_assumption_and_is_stored_as_a_choice(
    client: httpx.AsyncClient, mailer
) -> None:  # type: ignore[no-untyped-def]
    h = await auth(client, mailer)
    for k, v in {
        "age": "30",
        "annual_income": "600000",
        "monthly_expenses": "20000",
        "retirement_age": "60",
        "life_expectancy": "85",
    }.items():
        await put(client, h, k, v)
    base = (await client.post(URL, headers=h)).json()
    assert any("Risk profile" in a for a in base["assumptions"])
    await put(client, h, "risk_profile", "Conservative")
    cons = (await client.post(URL, headers=h)).json()
    assert not any("Risk profile" in a for a in cons["assumptions"])  # now stated, no longer assumed
    assert cons["input_digest"] != base["input_digest"]
    f08 = lambda s: next(f for f in s["factors"] if f["id"] == "F08")["value"]  # noqa: E731
    assert float(f08(cons)) > float(f08(base))  # a lower assumed return needs a larger SIP


async def test_no_kids_excludes_the_kids_factor_and_rescales(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await auth(client, mailer)
    for k, v in {**FULL, "kids": "0"}.items():
        await put(client, h, k, v)
    s = (await client.post(URL, headers=h)).json()
    f15 = next(f for f in s["factors"] if f["id"] == "F15")
    assert f15["status"] == "not_applicable" and s["confidence"] == "0.9500"
    assert s["early_estimate"] is False and s["message"]


async def test_invalid_new_field_values_are_rejected(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await auth(client, mailer)
    for key, bad in (("risk_profile", "reckless"), ("kids", "99"), ("life_expectancy", "20"), ("loans_outstanding", "-1")):
        r = await client.patch(f"{API}/profile/facts/{key}", headers=h, json={"value": bad})
        assert r.status_code == 422, (key, r.text)
