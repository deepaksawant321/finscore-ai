import httpx
from sqlalchemy import text

from app.config import Settings
from app.infra.crypto import generate_key
from app.main import create_app
from tests.integration.test_intelligence import auth_client

API = "/api/v1"
MIXED = {  # savings 16% (amber), cushion 4.3 months (amber), EMI 24% (amber), health cover yes (green), term cover no (red)
    "annual_income": "2000000", "monthly_expenses": "140000", "liquid_assets": "600000", "monthly_emi_total": "40000",
    "has_health_insurance": "true", "has_term_insurance": "false",
}  # fmt: skip


async def user_with(client: httpx.AsyncClient, mailer, facts: dict[str, str], email: str = "a@example.com") -> dict[str, str]:  # type: ignore[no-untyped-def]
    h = await auth_client(client, mailer, email)
    for k, v in facts.items():
        assert (await client.patch(f"{API}/profile/facts/{k}", headers=h, json={"value": v})).status_code == 200
    return h


async def check(client: httpx.AsyncClient, h: dict[str, str]) -> dict:  # type: ignore[type-arg]
    r = await client.post(f"{API}/health-monitor/check", headers=h)
    assert r.status_code == 200, r.text
    return r.json()  # type: ignore[no-any-return]


def vitals(rep: dict) -> dict[str, dict]:  # type: ignore[type-arg]
    return {v["key"]: v for v in rep["vitals"]}


async def test_vitals_overall_and_quality_are_reported_separately(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await user_with(client, mailer, MIXED)
    rep = await check(client, h)
    v = vitals(rep)
    assert {k: x["status"] for k, x in v.items()} == {
        "savings_rate": "amber",
        "emergency_cushion": "amber",
        "debt_load": "amber",
        "health_cover": "green",
        "life_cover": "red",
    }
    assert rep["overall"] == "red" and rep["data_quality"] == "good"  # poor health, good data: two different verdicts
    assert v["savings_rate"]["value_display"] == "16%" and v["emergency_cushion"]["value_display"] == "4.3 months"
    assert "Green at 20% or more" in v["savings_rate"]["rule_text"] and v["health_cover"]["value_display"] == "Yes"
    assert (
        rep["official"] is False and "NOT APPROVED" in rep["watermark"] and rep["events"] == []
    )  # first check: nothing to compare


async def test_check_is_idempotent_and_records_history_only_on_change(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await user_with(client, mailer, MIXED)
    a, b = await check(client, h), await check(client, h)
    assert a["checked_at"] == b["checked_at"]
    assert len((await client.get(f"{API}/health-monitor/history", headers=h)).json()) == 1
    await client.patch(f"{API}/profile/facts/has_term_insurance", headers=h, json={"value": "true"})
    await check(client, h)
    hist = (await client.get(f"{API}/health-monitor/history", headers=h)).json()
    assert len(hist) == 2 and hist[0]["overall"] == "amber" and hist[1]["overall"] == "red"


async def test_real_improvement_and_decline_are_health_events(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await user_with(client, mailer, MIXED)
    await check(client, h)
    await client.patch(f"{API}/profile/facts/has_term_insurance", headers=h, json={"value": "true"})
    better = (await check(client, h))["events"]
    assert [(e["vital"], e["kind"], e["category"]) for e in better] == [("life_cover", "health_better", "health")]
    await client.patch(f"{API}/profile/facts/liquid_assets", headers=h, json={"value": "100000"})  # cushion falls to 0.7 months
    worse = (await check(client, h))["events"]
    assert [(e["vital"], e["kind"], e["category"], e["to_status"]) for e in worse] == [
        ("emergency_cushion", "health_worse", "health", "red")
    ]
    assert "moved from amber to red" in worse[0]["message"]


async def test_a_newly_measured_red_is_data_quality_news_not_a_decline(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await user_with(client, mailer, {"annual_income": "2000000", "monthly_expenses": "140000"})
    first = await check(client, h)
    assert first["data_quality"] == "poor" and vitals(first)["emergency_cushion"]["status"] == "unknown"
    await client.patch(
        f"{API}/profile/facts/liquid_assets", headers=h, json={"value": "50000"}
    )  # measured for the first time: red
    rep = await check(client, h)
    assert vitals(rep)["emergency_cushion"]["status"] == "red"
    assert [(e["kind"], e["category"]) for e in rep["events"]] == [("newly_measured", "data_quality")]
    assert "new information, not a decline" in rep["events"][0]["message"]


async def test_stale_numbers_lower_data_quality_but_do_not_change_health(client: httpx.AsyncClient, app, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await user_with(client, mailer, MIXED)
    before = await check(client, h)
    async with app.state.sessionmaker() as s:
        await s.execute(
            text(
                "UPDATE facts SET valid_from = valid_from - interval '400 days' WHERE field_key IN ('liquid_assets','monthly_expenses')"
            )
        )
        await s.commit()
    rep = await check(client, h)
    assert {k: x["status"] for k, x in vitals(rep).items()} == {
        k: x["status"] for k, x in vitals(before).items()
    }  # health unchanged
    assert rep["overall"] == before["overall"] and rep["data_quality"] in ("fair", "poor")
    assert vitals(rep)["emergency_cushion"]["stale"] is True and vitals(rep)["emergency_cushion"]["fact_age_days"] >= 400
    assert {(e["kind"], e["category"]) for e in rep["events"]} == {("went_stale", "data_quality")}
    assert not any(e["category"] == "health" for e in rep["events"])


async def test_get_is_read_only_and_shows_the_last_recorded_events(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await user_with(client, mailer, MIXED)
    live = (await client.get(f"{API}/health-monitor", headers=h)).json()
    assert (
        live["overall"] == "red" and (await client.get(f"{API}/health-monitor/history", headers=h)).json() == []
    )  # nothing recorded
    await check(client, h)
    await client.patch(f"{API}/profile/facts/has_term_insurance", headers=h, json={"value": "true"})
    await check(client, h)
    assert (await client.get(f"{API}/health-monitor", headers=h)).json()["events"][0]["kind"] == "health_better"


async def test_no_data_means_unknown_and_poor_quality_not_an_error(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await auth_client(client, mailer)
    rep = await check(client, h)
    assert rep["overall"] == "unknown" and rep["data_quality"] == "poor" and all(not v["known"] for v in rep["vitals"])


async def test_a_genuine_decline_creates_a_health_alert_nudge_but_stale_data_does_not(
    client: httpx.AsyncClient, app, mailer
) -> None:  # type: ignore[no-untyped-def]
    h = await user_with(client, mailer, MIXED)
    await client.put(f"{API}/notification-prefs", headers=h, json={"in_app_enabled": True, "max_active": 10, "muted_rules": []})
    assert "health_alert" not in [
        n["rule"] for n in (await client.post(f"{API}/nudges/refresh", headers=h)).json()
    ]  # first check
    await client.patch(f"{API}/profile/facts/liquid_assets", headers=h, json={"value": "100000"})
    ns = (await client.post(f"{API}/nudges/refresh", headers=h)).json()
    alert = next(n for n in ns if n["rule"] == "health_alert")
    assert (
        alert["priority"] == "high"
        and "Emergency cushion slipped to red" in alert["title"]
        and alert["cta_path"] == "/app/health"
    )
    assert (await client.patch(f"{API}/nudges/{alert['id']}", headers=h, json={"action": "dismiss"})).status_code == 200
    again = (await client.post(f"{API}/nudges/refresh", headers=h)).json()
    assert "health_alert" not in [n["rule"] for n in again]  # no repeat after dismissal
    async with app.state.sessionmaker() as s:
        await s.execute(
            text("UPDATE facts SET valid_from = valid_from - interval '400 days' WHERE field_key='monthly_emi_total'")
        )
        await s.commit()
    assert "health_alert" not in [
        n["rule"] for n in (await client.post(f"{API}/nudges/refresh", headers=h)).json()
    ]  # staleness is not decline


async def test_private_encrypted_and_blocked_in_production(client: httpx.AsyncClient, app, mailer) -> None:  # type: ignore[no-untyped-def]
    ha = await user_with(client, mailer, MIXED, "a@example.com")
    await check(client, ha)
    hb = await auth_client(client, mailer, "b@example.com")
    assert (await client.get(f"{API}/health-monitor/history", headers=hb)).json() == []
    async with app.state.sessionmaker() as s:
        raw = (await s.execute(text("SELECT vitals FROM health_snapshots LIMIT 1"))).scalar_one()
    assert "emergency_cushion" not in raw and "status" not in raw
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
        r = await pc.post(f"{API}/health-monitor/check", headers=ha)
    assert r.status_code == 503 and r.json()["code"] == "rulebook_not_approved"
