from datetime import UTC, datetime, timedelta

import httpx
from sqlalchemy import text

from app.config import Settings
from app.infra.crypto import generate_key
from app.main import create_app
from tests.integration.test_coach import ask, coach, with_score
from tests.integration.test_intelligence import auth_client

API = "/api/v1"
WEAK = {  # income 20 lakh (1,66,667/month), spends 1.5 lakh, 2 lakh saved, 60k EMI, no insurance
    "annual_income": "2000000", "monthly_expenses": "150000", "liquid_assets": "200000", "monthly_emi_total": "60000",
    "has_health_insurance": "false", "has_term_insurance": "false",
}  # fmt: skip


async def weak_user(client: httpx.AsyncClient, mailer, email: str = "a@example.com") -> dict[str, str]:  # type: ignore[no-untyped-def]
    h = await auth_client(client, mailer, email)
    for k, v in WEAK.items():
        r = await client.patch(f"{API}/profile/facts/{k}", headers=h, json={"value": v})
        assert r.status_code == 200, r.text
    return h


async def refresh(client: httpx.AsyncClient, h: dict[str, str]) -> list[dict]:  # type: ignore[type-arg]
    r = await client.post(f"{API}/actions/refresh", headers=h)
    assert r.status_code == 200, r.text
    return r.json()  # type: ignore[no-any-return]


async def act(client: httpx.AsyncClient, h: dict[str, str], aid: str, verb: str, body: dict | None = None) -> httpx.Response:  # type: ignore[type-arg]
    return await client.post(f"{API}/actions/{aid}/{verb}", headers=h, json=body)


def by_key(actions: list[dict]) -> dict[str, dict]:  # type: ignore[type-arg]
    return {a["key"]: a for a in actions}


async def test_suggestions_are_ranked_watermarked_and_each_effect_comes_from_the_score_engine(
    client: httpx.AsyncClient, mailer
) -> None:  # type: ignore[no-untyped-def]
    h = await weak_user(client, mailer)
    acts = await refresh(client, h)
    assert set(by_key(acts)) == {
        "build_emergency_fund",
        "arrange_health_insurance",
        "arrange_term_insurance",
        "raise_savings_rate",
        "lower_emi_burden",
    }
    totals = [float(a["priority"]["total"]) for a in acts]
    assert totals == sorted(totals, reverse=True) and all(0 < t <= 100 for t in totals)
    for a in acts:
        p = a["priority"]
        parts = [float(p[k]) for k in ("impact", "financial_impact", "urgency", "ease", "confidence", "goal_alignment")]
        assert abs(sum(parts) - float(p["total"])) < 0.3 and a["official"] is False and "NOT AN APPROVED" in a["watermark"]
        assert a["state"] == "suggested" and set(a["allowed"]) == {"accept", "skip", "snooze"}
    # the expected score change equals what the simulator (same score engine) computes for the same concrete change
    ef = by_key(acts)["build_emergency_fund"]
    assert "₹9,00,000" in ef["cta"]
    sim = (
        await client.post(
            f"{API}/simulations", headers=h, json={"kind": "score_what_if", "overrides": {"liquid_assets": "900000"}}
        )
    ).json()
    assert float(ef["expected_score_change"]) == float(sim["result"]["delta"]) > 0
    ins = (
        await client.post(
            f"{API}/simulations", headers=h, json={"kind": "score_what_if", "overrides": {"has_health_insurance": "true"}}
        )
    ).json()
    assert float(by_key(acts)["arrange_health_insurance"]["expected_score_change"]) == float(ins["result"]["delta"])


async def test_refresh_is_idempotent_and_unknown_or_closed_gaps_are_not_offered(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await weak_user(client, mailer)
    first = await refresh(client, h)
    again = await refresh(client, h)
    assert [a["id"] for a in first] == [a["id"] for a in again]
    await client.patch(f"{API}/profile/facts/has_health_insurance", headers=h, json={"value": "true"})
    assert "arrange_health_insurance" not in by_key(await refresh(client, h))  # gap closed => offer withdrawn
    h2 = await auth_client(client, mailer, "sparse@example.com")  # only income + expenses known
    for k in ("annual_income", "monthly_expenses"):
        await client.patch(
            f"{API}/profile/facts/{k}", headers=h2, json={"value": "2000000" if k == "annual_income" else "150000"}
        )
    keys = set(by_key(await refresh(client, h2)))
    assert keys == {"raise_savings_rate"}  # emergency fund, EMI and insurance gaps are UNKNOWN there, so not suggested
    h3 = await auth_client(client, mailer, "empty@example.com")
    assert await refresh(client, h3) == []  # no data, no actions, no error


async def test_full_lifecycle_complete_then_verified_only_when_the_numbers_show_it(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await weak_user(client, mailer)
    await client.post(f"{API}/score/compute", headers=h)
    ef = by_key(await refresh(client, h))["build_emergency_fund"]
    assert (await act(client, h, ef["id"], "complete")).status_code == 409  # cannot skip the accept step
    assert (await act(client, h, ef["id"], "accept")).json()["state"] == "accepted"
    assert (await act(client, h, ef["id"], "start")).json()["state"] == "in_progress"
    done = (await act(client, h, ef["id"], "complete")).json()
    assert done["state"] == "completed" and done["verified"] is False  # claiming it is not proof
    assert by_key(await refresh(client, h))["build_emergency_fund"]["state"] == "completed"  # still waiting for the numbers
    runs_before = len((await client.get(f"{API}/score/history", headers=h)).json())
    await client.patch(f"{API}/profile/facts/liquid_assets", headers=h, json={"value": "900000"})
    await refresh(client, h)
    closed = by_key((await client.get(f"{API}/actions", headers=h, params={"include_closed": "true"})).json())
    v = closed["build_emergency_fund"]
    assert v["state"] == "verified" and v["verified"] is True and v["allowed"] == []
    hist = (await client.get(f"{API}/score/history", headers=h)).json()
    assert len(hist) == runs_before + 1 and float(hist[0]["overall"]) > float(
        hist[1]["overall"]
    )  # verified action updated the score
    tl = (await client.get(f"{API}/timeline", headers=h)).json()
    assert any("Build your emergency fund: verified" in t["title"] for t in tl) and any(t["kind"] == "score" for t in tl)
    assert "build_emergency_fund" not in by_key(
        (await client.get(f"{API}/actions", headers=h)).json()
    )  # closed actions leave the list


async def test_verification_links_to_the_fact_that_proved_it(client: httpx.AsyncClient, app, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await weak_user(client, mailer)
    ins = by_key(await refresh(client, h))["arrange_term_insurance"]
    await act(client, h, ins["id"], "accept")
    await client.patch(f"{API}/profile/facts/has_term_insurance", headers=h, json={"value": "true"})
    done = await act(client, h, ins["id"], "complete")
    assert done.json()["state"] == "verified"  # numbers already show it at the moment of "done"
    async with app.state.sessionmaker() as s:
        row = (
            await s.execute(
                text(
                    "SELECT a.verified_by_fact_id, f.field_key, f.value FROM user_actions a JOIN facts f ON f.id=a.verified_by_fact_id WHERE a.id=:i"
                ),
                {"i": ins["id"]},
            )
        ).one()
    assert row.field_key == "has_term_insurance" and row.value == "true"


async def test_skip_snooze_and_reopen(client: httpx.AsyncClient, app, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await weak_user(client, mailer)
    acts = by_key(await refresh(client, h))
    sk, sn = acts["arrange_term_insurance"], acts["raise_savings_rate"]
    assert (await act(client, h, sk["id"], "skip")).json()["state"] == "skipped"
    assert "arrange_term_insurance" not in by_key(await refresh(client, h))  # a declined action is not nagged
    assert (await act(client, h, sk["id"], "reopen")).json()["state"] == "suggested"
    assert (await act(client, h, sn["id"], "snooze", {"days": 0})).status_code == 422
    assert (await act(client, h, sn["id"], "snooze")).status_code == 422  # a duration is required
    assert (await act(client, h, sn["id"], "snooze", {"days": 7})).json()["state"] == "snoozed"
    assert by_key(await refresh(client, h))["raise_savings_rate"]["state"] == "snoozed"  # still asleep
    async with app.state.sessionmaker() as s:
        await s.execute(
            text("UPDATE user_actions SET snoozed_until=:t WHERE id=:i"),
            {"t": datetime.now(UTC) - timedelta(minutes=1), "i": sn["id"]},
        )
        await s.commit()
    assert by_key(await refresh(client, h))["raise_savings_rate"]["state"] == "suggested"  # woke up
    assert (await act(client, h, sk["id"], "accept")).status_code == 200
    assert (await act(client, h, sk["id"], "snooze", {"days": 3})).status_code == 409  # not allowed once accepted


async def test_actions_are_private_and_blocked_in_production_until_approved(client: httpx.AsyncClient, app, mailer) -> None:  # type: ignore[no-untyped-def]
    ha = await weak_user(client, mailer, "a@example.com")
    aid = (await refresh(client, ha))[0]["id"]
    hb = await auth_client(client, mailer, "b@example.com")
    assert (await act(client, hb, aid, "accept")).status_code == 404
    assert (await client.get(f"{API}/actions", headers=hb)).json() == []
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
        r = await pc.post(f"{API}/actions/refresh", headers=ha)
    assert r.status_code == 503 and r.json()["code"] == "rulebook_not_approved"


async def test_coach_lists_top_actions_with_engine_numbers(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await weak_user(client, mailer)
    cid = await coach(client, h)
    t = await ask(client, h, cid, "What should I do next?")
    acts = await refresh(client, h)
    assert t["mode"] == "act" and "demo action list" in t["assistant_text"] and "DEMO rules" in t["assistant_text"]
    first = acts[0]
    assert (
        first["title"] in t["assistant_text"] and f"+{round(float(first['expected_score_change']))} points" in t["assistant_text"]
    )
    assert t["assistant_text"].count("Expected score change") == 3  # top three only
    h2 = await with_score(client, mailer, "full@example.com")  # nothing to improve under the demo rules
    cid2 = await coach(client, h2)
    assert "don't see an action" in (await ask(client, h2, cid2, "How can I improve my score?"))["assistant_text"]
