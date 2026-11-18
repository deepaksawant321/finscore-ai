import httpx
import pytest
from sqlalchemy import text

from app.config import Settings
from app.domains.profile.service import ProfileService
from app.infra.crypto import generate_key
from app.infra.errors import AppError
from app.main import create_app
from tests.conftest import PASSWORD, login, register_verified

API = "/api/v1"


async def auth_client(client: httpx.AsyncClient, mailer, email: str = "a@example.com") -> dict[str, str]:  # type: ignore[no-untyped-def]
    await register_verified(client, mailer, email)
    tok = (await login(client, email)).json()["access_token"]
    return {"Authorization": f"Bearer {tok}"}


async def start(client: httpx.AsyncClient, h: dict[str, str]) -> str:
    await client.post(f"{API}/consents", headers=h, json={"purpose": "ai_processing", "text_version": "v1"})
    r = await client.post(f"{API}/conversations", headers=h, json={"mode": "problem"})
    assert r.status_code == 201, r.text
    return r.json()["id"]


async def say(client: httpx.AsyncClient, h: dict[str, str], cid: str, content: str, accept: bool = True) -> dict:  # type: ignore[type-arg]
    r = await client.post(f"{API}/conversations/{cid}/messages", headers=h, json={"content": content})
    assert r.status_code == 200, r.text
    turn = r.json()
    if accept and turn["proposals"]:
        d = [{"proposal_id": p["id"], "action": "accept"} for p in turn["proposals"]]
        c = await client.post(f"{API}/conversations/{cid}/facts/confirm", headers=h, json={"decisions": d})
        assert c.status_code == 200, c.text
    return turn  # type: ignore[no-any-return]


async def test_interview_requires_ai_consent(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await auth_client(client, mailer)
    r = await client.post(f"{API}/conversations", headers=h, json={"mode": "problem"})
    assert r.status_code == 403 and r.json()["code"] == "consent_required"
    await client.post(f"{API}/consents", headers=h, json={"purpose": "ai_processing", "text_version": "v1"})
    assert (await client.post(f"{API}/conversations", headers=h, json={"mode": "problem"})).status_code == 201
    await client.delete(f"{API}/consents/ai_processing", headers=h)  # revocation stops new conversations
    assert (await client.post(f"{API}/conversations", headers=h, json={"mode": "problem"})).status_code == 403


async def test_full_journey_from_words_to_demo_score_with_explanation(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await auth_client(client, mailer)
    cid = await start(client, h)
    conv = (await client.get(f"{API}/conversations/{cid}", headers=h)).json()
    assert "one money problem" in conv["messages"][0]["content"] and "AI assistant" in conv["disclosure"]

    # A sum of two people's incomes is not auto-saved: it waits for the user to check it
    t1 = await say(client, h, cid, "I earn ₹22 lakh annually. My wife earns around ₹12 lakh.", accept=False)
    assert t1["proposals"][0]["field_key"] == "annual_income" and t1["proposals"][0]["value"] == "3400000.00"
    assert t1["proposals"][0]["status"] == "pending" and "Please check" in t1["assistant_text"]
    assert (await client.get(f"{API}/memory/facts", headers=h)).json() == []
    d = [{"proposal_id": t1["proposals"][0]["id"], "action": "accept"}]
    assert (await client.post(f"{API}/conversations/{cid}/facts/confirm", headers=h, json={"decisions": d})).json()[0][
        "value"
    ] == "3400000.00"
    facts = (await client.get(f"{API}/memory/facts", headers=h)).json()
    assert facts[0]["source_type"] == "USER_STATED" and facts[0]["source_ref"].startswith("message:")

    assert t1["next_question"]["field_key"] == "monthly_expenses"  # income is pending confirmation, so ask the next core fact
    t2 = await say(client, h, cid, "We spend about 1.2 lakh a month")
    assert t2["proposals"][0]["field_key"] == "monthly_expenses" and t2["ready_for_score"]
    await say(client, h, cid, "5 lakh", accept=True)  # awaiting liquid_assets (answer to my question)
    await say(client, h, cid, "none")  # EMIs

    s = await client.post(f"{API}/score/compute", headers=h)
    assert s.status_code == 200, s.text
    score = s.json()
    assert 300 <= float(score["overall"]) <= 900
    assert score["official"] is False and "NOT AN OFFICIAL" in score["watermark"]
    assert score["stage_provisional"] is True and score["trend"] == "new"
    assert score["early_estimate"] is True  # 3 of 20 areas scored => do not announce a stage
    assert 0 < float(score["confidence"]) < 1  # most pillars have no calculator yet
    scored = [p for p in score["pillars"] if p["score"] is not None]
    assert {p["id"] for p in scored} == {"SP-01", "SP-02", "SP-03"}  # insurance unknown => SP-06 not scored, never zero

    # Idempotent: same inputs => same run
    again = (await client.post(f"{API}/score/compute", headers=h)).json()
    assert again["id"] == score["id"]

    # Explanation is exact: reference + contributions == overall (to rounding of 2 dp contributions)
    ex = (await client.get(f"{API}/score/{score['id']}/explain", headers=h)).json()
    total = float(ex["reference"]) + sum(float(p["contribution"]) for p in scored)
    assert abs(total - float(ex["overall"])) < 0.05
    assert ex["watermark"] and ex["not_scored"] and "has_term_insurance" in ex["missing_inputs"]

    dna = (await client.get(f"{API}/dna", headers=h)).json()
    assert {t["key"] for t in dna["traits"]} == {"savings_identity", "debt_behaviour"}
    assert all(t["evidence_count"] >= 1 for t in dna["traits"]) and dna["watermark"]
    assert dna["traits"][0]["wording"].startswith("Your finances suggest")  # not an absolute diagnosis

    cov = {c["pillar_id"]: c for c in (await client.get(f"{API}/coverage", headers=h)).json()}
    assert cov["SP-01"]["state"] == "Stated" and cov["SP-06"]["state"] == "Unknown" and cov["SP-09"]["calculator"] is False


async def test_user_correction_creates_version_and_rescore_changes_trend(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await auth_client(client, mailer)
    cid = await start(client, h)
    await say(client, h, cid, "I earn 20 lakh a year. We spend 1 lakh per month.")
    first = (await client.post(f"{API}/score/compute", headers=h)).json()
    r = await client.patch(f"{API}/profile/facts/monthly_expenses", headers=h, json={"value": "200000"})
    assert r.status_code == 200 and r.json()["changed"] and r.json()["material_change"] is True  # +100% => flagged
    hist = (await client.get(f"{API}/memory/facts/monthly_expenses/history", headers=h)).json()
    assert len(hist) == 2 and hist[0]["valid_to"] is not None and hist[1]["valid_to"] is None  # old version kept
    assert hist[1]["source_ref"] == "user_correction"
    second = (await client.post(f"{API}/score/compute", headers=h)).json()
    assert second["id"] != first["id"] and second["trend"] == "declining"
    assert float(second["overall"]) < float(first["overall"])
    cmp = (await client.get(f"{API}/score/compare", headers=h, params={"from_run": first["id"], "to_run": second["id"]})).json()
    assert float(cmp["delta"]) < 0 and any(c["id"] == "SP-01" for c in cmp["material_changes"])
    # unchanged value is a no-op (no new version)
    r2 = await client.patch(f"{API}/profile/facts/monthly_expenses", headers=h, json={"value": "200000"})
    assert r2.json()["changed"] is False


async def test_invalid_and_unknown_facts_rejected(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await auth_client(client, mailer)
    assert (await client.patch(f"{API}/profile/facts/age", headers=h, json={"value": "5"})).status_code == 422
    assert (await client.patch(f"{API}/profile/facts/annual_income", headers=h, json={"value": "-1"})).status_code == 422
    assert (await client.patch(f"{API}/profile/facts/annual_income", headers=h, json={"value": "abc"})).status_code == 422
    r = await client.patch(f"{API}/profile/facts/password", headers=h, json={"value": "x"})
    assert r.status_code == 422 and r.json()["code"] == "unknown_field"


async def test_score_needs_data_and_is_blocked_in_production(client: httpx.AsyncClient, mailer, app, engine) -> None:  # type: ignore[no-untyped-def]
    h = await auth_client(client, mailer)
    r = await client.post(f"{API}/score/compute", headers=h)
    assert r.status_code == 422 and r.json()["code"] == "insufficient_data"
    assert (await client.get(f"{API}/score/current", headers=h)).status_code == 404
    await client.patch(f"{API}/profile/facts/annual_income", headers=h, json={"value": "1200000"})
    await client.patch(f"{API}/profile/facts/monthly_expenses", headers=h, json={"value": "50000"})
    # Same code, production settings: the unapproved (demo) rulebook must refuse to produce a score
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
        r = await pc.post(f"{API}/score/compute", headers=h)
    assert r.status_code == 503 and r.json()["code"] == "rulebook_not_approved"
    status = (await client.get(f"{API}/rulebook/status", headers=h)).json()
    assert status["official"] is False and "score.stage_matrix" in status["blocking_items"]


async def test_other_users_cannot_read_conversations_or_scores(client: httpx.AsyncClient, app, mailer) -> None:  # type: ignore[no-untyped-def]
    ha = await auth_client(client, mailer, "a@example.com")
    cid = await start(client, ha)
    await say(client, ha, cid, "I earn 20 lakh a year. We spend 1 lakh per month.")
    run = (await client.post(f"{API}/score/compute", headers=ha)).json()
    transport = httpx.ASGITransport(app=app, client=("203.0.113.50", 1))
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as other:
        hb = await auth_client(other, mailer, "b@example.com")
        assert (await other.get(f"{API}/conversations/{cid}", headers=hb)).status_code == 404
        assert (await other.post(f"{API}/conversations/{cid}/messages", headers=hb, json={"content": "hi"})).status_code == 404
        assert (await other.get(f"{API}/score/{run['id']}/explain", headers=hb)).status_code == 404
        assert (await other.get(f"{API}/memory/facts", headers=hb)).json() == []  # B sees none of A's facts
        assert (await other.get(f"{API}/score/current", headers=hb)).status_code == 404


async def test_conversation_text_is_encrypted_at_rest(client: httpx.AsyncClient, app, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await auth_client(client, mailer)
    cid = await start(client, h)
    await say(client, h, cid, "I earn 22 lakh a year, my secret marker is zebra-quartz-77", accept=False)
    async with app.state.sessionmaker() as s:
        raw = (await s.execute(text("SELECT content FROM messages WHERE role='user'"))).scalar_one()
        props = (await s.execute(text("SELECT proposals FROM message_extractions"))).scalar_one()
    assert "zebra-quartz" not in raw and raw.startswith("gAAAA")
    assert "22 lakh" not in props and "annual_income" not in props
    # and it still round-trips through the API
    msgs = (await client.get(f"{API}/conversations/{cid}", headers=h)).json()["messages"]
    assert any("zebra-quartz-77" in m["content"] for m in msgs)


async def test_lower_trust_source_cannot_overwrite_stated_fact(client: httpx.AsyncClient, app, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await auth_client(client, mailer)
    await client.patch(f"{API}/profile/facts/annual_income", headers=h, json={"value": "1200000"})
    uid = (await client.get(f"{API}/users/me", headers=h)).json()["id"]
    import uuid

    async with app.state.sessionmaker() as s:
        svc = ProfileService(s)
        with pytest.raises(AppError) as e:
            await svc.record_fact(uuid.UUID(uid), "annual_income", "9999999", source_type="INFERRED")
        assert e.value.status == 409
        # an explicit user correction always wins
        res = await svc.record_fact(uuid.UUID(uid), "annual_income", "1500000", source_type="USER_STATED", user_correction=True)
        assert res.changed
        await s.commit()


async def test_vague_message_records_nothing_and_asks_next_question(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await auth_client(client, mailer)
    cid = await start(client, h)
    t = await say(client, h, cid, "I want to be financially free someday")
    assert t["proposals"] == [] and "haven't recorded anything" in t["assistant_text"]
    assert t["next_question"]["field_key"] == "annual_income" and t["next_question"]["why"]
    assert (await client.get(f"{API}/memory/facts", headers=h)).json() == []


async def test_retirement_intent_changes_question_order(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await auth_client(client, mailer)
    cid = await start(client, h)
    t = await say(client, h, cid, "Can I retire at 50?", accept=False)
    # age + retirement age are asked before generic fields; here retirement_age was just stated, so age comes first
    assert t["proposals"][0]["field_key"] == "retirement_age" and t["next_question"]["field_key"] == "age"


async def test_audit_trail_records_fact_and_score_events(client: httpx.AsyncClient, app, mailer) -> None:  # type: ignore[no-untyped-def]
    from app.domains.governance.service import verify_chain

    h = await auth_client(client, mailer)
    cid = await start(client, h)
    await say(client, h, cid, "I earn 20 lakh a year. We spend 1 lakh per month.")
    await client.post(f"{API}/score/compute", headers=h)
    async with app.state.sessionmaker() as s:
        actions = {r[0] for r in (await s.execute(text("SELECT action FROM audit_log"))).all()}
        assert {"conversation.started", "fact.recorded", "score.computed"} <= actions
        assert await verify_chain(s)
    assert PASSWORD


# ======================= auto-save of clear answers =======================
async def facts_by_key(client: httpx.AsyncClient, h: dict[str, str]) -> dict[str, dict]:  # type: ignore[type-arg]
    return {f["field_key"]: f for f in (await client.get(f"{API}/memory/facts", headers=h)).json()}


async def decide(
    client: httpx.AsyncClient, h: dict[str, str], cid: str, pid: str, action: str, value: str | None = None
) -> httpx.Response:
    body = {"decisions": [{"proposal_id": pid, "action": action, "value": value}]}
    return await client.post(f"{API}/conversations/{cid}/facts/confirm", headers=h, json=body)


async def test_clear_answer_is_saved_without_asking_and_marked_unconfirmed(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await auth_client(client, mailer)
    cid = await start(client, h)
    t = await say(client, h, cid, "I earn 20 lakh a year", accept=False)
    p = t["proposals"][0]
    assert p["field_key"] == "annual_income" and p["status"] == "auto_saved" and "saved" in t["assistant_text"]
    f = (await facts_by_key(client, h))["annual_income"]
    assert f["value"] == "2000000.00" and f["source_type"] == "USER_STATED" and f["source_ref"].startswith("message:")
    assert float(f["confidence"]) < 1  # saved from the chat, not yet confirmed by the user
    assert t["next_question"]["field_key"] != "annual_income"  # never asked again
    # confirming it later keeps the same version and marks it confirmed
    assert (await decide(client, h, cid, p["id"], "accept")).status_code == 200
    hist = (await client.get(f"{API}/memory/facts/annual_income/history", headers=h)).json()
    assert len(hist) == 1 and float(hist[0]["confidence"]) == 1.0


async def test_undo_removes_an_auto_saved_fact_and_is_audited(client: httpx.AsyncClient, app, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await auth_client(client, mailer)
    cid = await start(client, h)
    t = await say(client, h, cid, "We spend 1 lakh per month", accept=False)
    p = t["proposals"][0]
    assert p["status"] == "auto_saved" and "monthly_expenses" in await facts_by_key(client, h)
    assert (await decide(client, h, cid, p["id"], "reject")).status_code == 200
    assert "monthly_expenses" not in await facts_by_key(client, h)
    hist = (await client.get(f"{API}/memory/facts/monthly_expenses/history", headers=h)).json()
    assert len(hist) == 1 and hist[0]["valid_to"] is not None  # kept in history, no longer current
    assert (await decide(client, h, cid, p["id"], "reject")).status_code == 200  # a second undo is a no-op
    async with app.state.sessionmaker() as s:
        actions = {r[0] for r in (await s.execute(text("SELECT action FROM audit_log"))).all()}
    assert {"fact.recorded", "fact.retracted"} <= actions


async def test_edit_of_an_auto_saved_fact_is_a_correction(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await auth_client(client, mailer)
    cid = await start(client, h)
    p = (await say(client, h, cid, "I earn 20 lakh a year", accept=False))["proposals"][0]
    r = await decide(client, h, cid, p["id"], "edit", "2500000")
    assert r.status_code == 200 and r.json()[0]["value"] == "2500000.00"
    f = (await facts_by_key(client, h))["annual_income"]
    assert f["value"] == "2500000.00" and float(f["confidence"]) == 1.0


async def test_a_different_value_for_a_known_field_is_never_auto_saved(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await auth_client(client, mailer)
    await client.patch(f"{API}/profile/facts/annual_income", headers=h, json={"value": "1200000"})
    cid = await start(client, h)
    t = await say(client, h, cid, "I earn 20 lakh a year", accept=False)
    assert t["proposals"][0]["status"] == "pending"
    assert (await facts_by_key(client, h))["annual_income"]["value"] == "1200000.00"  # unchanged until the user agrees


async def test_undo_after_the_fact_was_corrected_elsewhere_is_refused(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await auth_client(client, mailer)
    cid = await start(client, h)
    p = (await say(client, h, cid, "I earn 20 lakh a year", accept=False))["proposals"][0]
    await client.patch(f"{API}/profile/facts/annual_income", headers=h, json={"value": "2200000"})  # Memory page
    r = await decide(client, h, cid, p["id"], "reject")
    assert r.status_code == 409 and r.json()["code"] == "fact_changed"
    assert (await facts_by_key(client, h))["annual_income"]["value"] == "2200000.00"  # the correction is kept


async def test_an_amount_about_something_else_is_not_saved_as_the_answer_to_my_question(
    client: httpx.AsyncClient, mailer
) -> None:  # type: ignore[no-untyped-def]
    h = await auth_client(client, mailer)
    cid = await start(client, h)
    t1 = await say(client, h, cid, "I earn 20 lakh a year. We spend 1 lakh per month", accept=False)
    assert t1["next_question"]["field_key"] == "liquid_assets"
    t2 = await say(client, h, cid, "Actually my wife also earns 12 lakh and I earn 22 lakh", accept=False)
    assert {p["field_key"]: p["status"] for p in t2["proposals"]} == {"annual_income": "pending", "liquid_assets": "pending"}
    facts = await facts_by_key(client, h)
    assert "liquid_assets" not in facts and facts["annual_income"]["value"] == "2000000.00"  # nothing changed without the user
