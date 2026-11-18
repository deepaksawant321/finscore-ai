import uuid
from datetime import datetime

import httpx
from sqlalchemy import text

from app.domains.governance.service import verify_chain
from app.domains.identity.models import UserRole
from app.domains.privacy.service import PrivacyService
from tests.conftest import PASSWORD, login, register_verified

API = "/api/v1"


async def user(client: httpx.AsyncClient, mailer, email: str = "a@example.com") -> dict[str, str]:  # type: ignore[no-untyped-def]
    await register_verified(client, mailer, email)
    return {"Authorization": f"Bearer {(await login(client, email)).json()['access_token']}"}


async def conversation(client: httpx.AsyncClient, h: dict[str, str]) -> str:
    await client.post(f"{API}/consents", headers=h, json={"purpose": "ai_processing", "text_version": "v1"})
    return (await client.post(f"{API}/conversations", headers=h, json={"mode": "problem"})).json()["id"]  # type: ignore[no-any-return]


async def other_client(app, ip: str = "203.0.113.77") -> httpx.AsyncClient:  # type: ignore[no-untyped-def]
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=app, client=(ip, 1)), base_url="http://test")


async def make_staff(app, email: str, role: str = "support") -> None:  # type: ignore[no-untyped-def]
    async with app.state.sessionmaker() as s:
        uid = (await s.execute(text("SELECT id FROM users WHERE email=:e"), {"e": email})).scalar_one()
        s.add(UserRole(user_id=uid, role=role))
        await s.commit()


# ======================= advice guard in the interview =======================
async def test_regulated_question_is_declined_not_extracted_and_audited(client: httpx.AsyncClient, app, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await user(client, mailer)
    cid = await conversation(client, h)
    r = await client.post(
        f"{API}/conversations/{cid}/messages", headers=h, json={"content": "Which stock should I buy? I earn 20 lakh a year"}
    )
    t = r.json()
    assert r.status_code == 200 and "can't recommend specific stocks" in t["assistant_text"]
    assert t["escalation_suggested"] is True and t["proposals"] == []  # nothing extracted from a declined message
    async with app.state.sessionmaker() as s:
        assert "advice.regulated_request_declined" in {
            r[0] for r in (await s.execute(text("SELECT action FROM audit_log"))).all()
        }


async def test_normal_turn_is_classified_and_not_blocked(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await user(client, mailer)
    cid = await conversation(client, h)
    t = (await client.post(f"{API}/conversations/{cid}/messages", headers=h, json={"content": "I earn 20 lakh a year"})).json()
    assert t["advice_class"] in ("information", "planning", "education") and t["escalation_suggested"] is False


async def test_distress_message_gets_support_text_and_a_human_flag_without_copying_the_text(
    client: httpx.AsyncClient, app, mailer
) -> None:  # type: ignore[no-untyped-def]
    h = await user(client, mailer)
    cid = await conversation(client, h)
    t = (
        await client.post(f"{API}/conversations/{cid}/messages", headers=h, json={"content": "I can't go on, I want to die"})
    ).json()
    assert "Tele-MANAS" in t["assistant_text"] and t["escalation_id"] and t["proposals"] == []
    mine = (await client.get(f"{API}/escalations", headers=h)).json()
    assert mine[0]["reason"] == "distress" and mine[0]["note"] is None  # sensitive text is not duplicated into the ticket
    created = datetime.fromisoformat(mine[0]["created_at"])
    due = datetime.fromisoformat(mine[0]["sla_due_at"])
    assert (due - created).total_seconds() <= 5 * 3600  # distress gets the short placeholder SLA


# ======================= escalations =======================
async def test_escalation_lifecycle_privacy_and_staff_access(client: httpx.AsyncClient, app, mailer) -> None:  # type: ignore[no-untyped-def]
    ha = await user(client, mailer, "a@example.com")
    cid = await conversation(client, ha)
    r = await client.post(
        f"{API}/escalations",
        headers=ha,
        json={"reason": "user_request", "note": "Please review my loan question", "conversation_id": cid},
    )
    assert r.status_code == 201
    eid = r.json()["id"]
    assert (await client.post(f"{API}/escalations", headers=ha, json={"reason": "bogus"})).status_code == 422

    async with await other_client(app) as other:
        hb = await user(other, mailer, "b@example.com")
        assert (await other.get(f"{API}/escalations/{eid}", headers=hb)).status_code == 404  # IDOR
        assert (await other.get(f"{API}/escalations", headers=hb)).json() == []
        bad = await other.post(f"{API}/escalations", headers=hb, json={"reason": "other", "conversation_id": cid})
        assert bad.status_code == 404  # cannot attach to someone else's conversation
        assert (await other.get(f"{API}/admin/escalations", headers=hb)).status_code == 403  # not staff

    await make_staff(app, "b@example.com", "support")
    async with await other_client(app, "203.0.113.78") as staff:
        hs = {"Authorization": f"Bearer {(await login(staff, 'b@example.com')).json()['access_token']}"}
        q = (await staff.get(f"{API}/admin/escalations", headers=hs, params={"status": "open"})).json()
        assert [x["id"] for x in q] == [eid] and q[0]["note"] == "Please review my loan question"
        u = await staff.patch(f"{API}/admin/escalations/{eid}", headers=hs, json={"assign_to_me": True})
        assert u.json()["status"] == "assigned" and u.json()["assigned_to"]
        done = await staff.patch(
            f"{API}/admin/escalations/{eid}", headers=hs, json={"status": "resolved", "resolution_note": "Called the user"}
        )
        assert done.json()["status"] == "resolved" and done.json()["resolved_at"]
    mine = (await client.get(f"{API}/escalations/{eid}", headers=ha)).json()
    assert mine["status"] == "resolved" and mine["resolution_note"] == "Called the user"
    async with app.state.sessionmaker() as s:
        actions = [r[0] for r in (await s.execute(text("SELECT action FROM audit_log"))).all()]
        assert {"escalation.created", "escalation.staff_viewed", "escalation.staff_updated"} <= set(actions)
        raw = (await s.execute(text("SELECT note FROM escalations"))).scalar_one()
        assert "loan question" not in raw and raw.startswith("gAAAA")  # encrypted at rest
        assert await verify_chain(s)


async def test_staff_role_is_checked_against_the_database_not_just_the_token(client: httpx.AsyncClient, app, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await user(client, mailer)
    await make_staff(app, "a@example.com", "support")
    tok = {"Authorization": f"Bearer {(await login(client)).json()['access_token']}"}  # token now contains the role
    assert (await client.get(f"{API}/admin/escalations", headers=tok)).status_code == 200
    async with app.state.sessionmaker() as s:
        await s.execute(text("DELETE FROM user_roles WHERE role='support'"))
        await s.commit()
    assert (await client.get(f"{API}/admin/escalations", headers=tok)).status_code == 403  # revoked immediately
    assert h


# ======================= data export =======================
async def test_data_export_is_complete_and_leaks_nothing_else(client: httpx.AsyncClient, app, mailer) -> None:  # type: ignore[no-untyped-def]
    ha = await user(client, mailer, "a@example.com")
    cid = await conversation(client, ha)
    t = (
        await client.post(
            f"{API}/conversations/{cid}/messages",
            headers=ha,
            json={"content": "I earn 20 lakh a year. We spend 1 lakh per month."},
        )
    ).json()
    await client.post(
        f"{API}/conversations/{cid}/facts/confirm",
        headers=ha,
        json={"decisions": [{"proposal_id": p["id"], "action": "accept"} for p in t["proposals"]]},
    )
    await client.post(f"{API}/score/compute", headers=ha)
    await client.post(
        f"{API}/goals", headers=ha, json={"name": "Car", "target_amount_today": "800000", "target_date": "2032-01-01"}
    )
    await client.post(f"{API}/escalations", headers=ha, json={"note": "hello team"})
    async with await other_client(app) as other:  # a second user whose data must never appear
        hb = await user(other, mailer, "b@example.com")
        await other.patch(f"{API}/profile/facts/annual_income", headers=hb, json={"value": "7777777"})

    r = await client.get(f"{API}/users/me/data-export", headers=ha)
    assert r.status_code == 200 and "attachment" in r.headers["content-disposition"] and r.headers["cache-control"] == "no-store"
    d = r.json()
    assert d["account"]["email"] == "a@example.com" and {c["purpose"] for c in d["consents"]} == {
        "core_processing",
        "ai_processing",
    }
    assert {f["field"] for f in d["financial_facts"]} == {"annual_income", "monthly_expenses"}
    assert any("20 lakh" in m["content"] for m in d["conversations"][0]["messages"])  # decrypted for the owner
    assert d["score_history"] and d["goals"][0]["name"] == "Car" and d["support_requests"][0]["note"] == "hello team"
    assert any(e["action"] == "score.computed" for e in d["activity_log"])
    blob = r.text
    assert "7777777" not in blob and "b@example.com" not in blob  # no other user's data
    assert "password" not in blob.lower() and "argon2" not in blob and "token_hash" not in blob
    assert (await client.get(f"{API}/users/me/data-export")).status_code == 401
    async with app.state.sessionmaker() as s:
        assert (await s.execute(text("SELECT count(*) FROM data_requests WHERE kind='export'"))).scalar_one() == 1


# ======================= erasure =======================
async def test_erasure_requires_password_cooling_off_cancel_and_then_purges_everything(
    client: httpx.AsyncClient, app, mailer
) -> None:  # type: ignore[no-untyped-def]
    ha = await user(client, mailer, "a@example.com")
    cid = await conversation(client, ha)
    t = (await client.post(f"{API}/conversations/{cid}/messages", headers=ha, json={"content": "I earn 20 lakh a year"})).json()
    await client.post(
        f"{API}/conversations/{cid}/facts/confirm",
        headers=ha,
        json={"decisions": [{"proposal_id": t["proposals"][0]["id"], "action": "accept"}]},
    )
    await client.post(
        f"{API}/goals", headers=ha, json={"name": "Car", "target_amount_today": "800000", "target_date": "2032-01-01"}
    )
    async with await other_client(app) as other:
        hb = await user(other, mailer, "b@example.com")
        await other.patch(f"{API}/profile/facts/annual_income", headers=hb, json={"value": "900000"})

        assert (
            await client.post(f"{API}/users/me/erasure-request", headers=ha, json={"password": "Wrong-Password-1"})
        ).status_code == 403
        assert (await client.get(f"{API}/users/me/erasure-request", headers=ha)).json()["pending"] is False
        r = await client.post(f"{API}/users/me/erasure-request", headers=ha, json={"password": PASSWORD})
        assert r.status_code == 202 and r.json()["pending"] and r.json()["scheduled_for"]
        again = await client.post(f"{API}/users/me/erasure-request", headers=ha, json={"password": PASSWORD})
        assert again.json()["requested_at"] == r.json()["requested_at"]  # idempotent
        assert (await client.get(f"{API}/memory/facts", headers=ha)).status_code == 200  # still usable during cooling-off

        assert (await client.delete(f"{API}/users/me/erasure-request", headers=ha)).status_code == 204
        assert (await client.get(f"{API}/users/me/erasure-request", headers=ha)).json()["pending"] is False
        assert (await client.delete(f"{API}/users/me/erasure-request", headers=ha)).status_code == 404

        # Real request, zero cooling-off in this test only, then run the purge job
        app.state.settings.erasure_cooling_days = 0
        await client.post(f"{API}/users/me/erasure-request", headers=ha, json={"password": PASSWORD})
        async with app.state.sessionmaker() as s:
            gone = await PrivacyService(s, app.state.settings).purge_due()
            await s.commit()
        assert len(gone) == 1

        async with app.state.sessionmaker() as s:
            for table in ("users", "facts", "goals", "conversations", "messages", "consents", "user_sessions", "score_runs"):
                n = (
                    await s.execute(
                        text(f"SELECT count(*) FROM {table} WHERE " + ("email='a@example.com'" if table == "users" else "1=1"))
                    )
                ).scalar_one()
                if table == "users":
                    assert n == 0
            uid = str(gone[0])
            for table in ("facts", "goals", "conversations", "consents", "user_sessions"):
                assert (await s.execute(text(f"SELECT count(*) FROM {table} WHERE user_id = :u"), {"u": uid})).scalar_one() == 0
            rec = (
                (
                    await s.execute(
                        text("SELECT status FROM data_requests WHERE kind='erasure' AND user_id=:u ORDER BY requested_at DESC"),
                        {"u": uid},
                    )
                )
                .scalars()
                .all()
            )
            assert rec[0] == "completed"  # proof of erasure survives
            assert await verify_chain(s)  # audit chain intact (opaque ids only)
            assert "privacy.erased" in {r[0] for r in (await s.execute(text("SELECT action FROM audit_log"))).all()}

        assert (await login(client, "a@example.com")).status_code == 401  # account is gone
        assert (await client.get(f"{API}/memory/facts", headers=ha)).status_code == 401  # token no longer maps to a user
        assert (await other.get(f"{API}/memory/facts", headers=hb)).json()[0]["value"] == "900000.00"  # B untouched


# ======================= goals =======================
async def test_goal_crud_validation_and_idor(client: httpx.AsyncClient, app, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await user(client, mailer)
    ok = {"name": "House down payment", "target_amount_today": "2500000", "target_date": "2034-06-01", "priority": "essential",
          "current_funding": "300000", "monthly_funding": "20000"}  # fmt: skip
    r = await client.post(f"{API}/goals", headers=h, json=ok)
    assert r.status_code == 201 and r.json()["source"] == "user" and r.json()["target_amount_today"] == "2500000.00"
    gid = r.json()["id"]
    for bad in (
        {**ok, "target_date": "2020-01-01"}, {**ok, "target_amount_today": "-5"}, {**ok, "target_amount_today": "0"},
        {**ok, "priority": "whenever"}, {**ok, "name": ""}, {**ok, "current_funding": "-1"},
    ):  # fmt: skip
        assert (await client.post(f"{API}/goals", headers=h, json=bad)).status_code == 422, bad
    p = await client.patch(f"{API}/goals/{gid}", headers=h, json={"monthly_funding": "25000", "name": "House"})
    assert p.json()["monthly_funding"] == "25000.00" and p.json()["name"] == "House"
    assert (await client.patch(f"{API}/goals/{gid}", headers=h, json={"target_date": "2001-01-01"})).status_code == 422

    async with await other_client(app) as other:
        hb = await user(other, mailer, "b@example.com")
        assert (await other.get(f"{API}/goals/{gid}", headers=hb)).status_code == 404
        assert (await other.patch(f"{API}/goals/{gid}", headers=hb, json={"name": "mine now"})).status_code == 404
        assert (await other.delete(f"{API}/goals/{gid}", headers=hb)).status_code == 404
        assert (await other.get(f"{API}/goals", headers=hb)).json() == []

    assert (await client.patch(f"{API}/goals/{gid}", headers=h, json={"status": "archived"})).json()["status"] == "archived"
    assert (await client.get(f"{API}/goals", headers=h)).json() == []
    assert len((await client.get(f"{API}/goals", headers=h, params={"include_archived": "true"})).json()) == 1
    assert (await client.delete(f"{API}/goals/{gid}", headers=h)).status_code == 204
    assert (await client.get(f"{API}/goals/{gid}", headers=h)).status_code == 404
    assert (await client.get(f"{API}/goals/{uuid.uuid4()}", headers=h)).status_code == 404


async def test_goal_funding_requires_explicit_assumptions_and_returns_them(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await user(client, mailer)
    gid = (
        await client.post(
            f"{API}/goals",
            headers=h,
            json={
                "name": "Retire fund",
                "target_amount_today": "1000000",
                "target_date": "2040-01-01",
                "monthly_funding": "10000",
            },
        )
    ).json()["id"]
    assert (await client.get(f"{API}/goals/{gid}/funding", headers=h)).status_code == 422  # no hidden defaults
    assert (
        await client.get(f"{API}/goals/{gid}/funding", headers=h, params={"assumed_return_pct": "99", "inflation_pct": "6"})
    ).status_code == 422
    r = await client.get(f"{API}/goals/{gid}/funding", headers=h, params={"assumed_return_pct": "10", "inflation_pct": "6"})
    assert r.status_code == 200
    f = r.json()
    assert f["months_remaining"] > 100 and float(f["future_target"]) > 1_000_000
    assert abs(float(f["projected_total"]) - (float(f["projected_from_current"]) + float(f["projected_from_monthly"]))) < 0.02
    assert any("10%" in a and "6%" in a for a in f["assumptions"]) and any("guarantee" in a.lower() for a in f["assumptions"])


async def test_goal_creation_is_audited_and_capped(client: httpx.AsyncClient, app, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await user(client, mailer)
    body = {"name": "g", "target_amount_today": "1000", "target_date": "2040-01-01"}
    first = await client.post(f"{API}/goals", headers=h, json=body)
    assert first.status_code == 201
    async with app.state.sessionmaker() as s:
        assert "goal.created" in {r[0] for r in (await s.execute(text("SELECT action FROM audit_log"))).all()}
    for _ in range(49):
        assert (await client.post(f"{API}/goals", headers=h, json=body)).status_code == 201
    over = await client.post(f"{API}/goals", headers=h, json=body)
    assert over.status_code == 409 and over.json()["code"] == "limit_reached"


async def test_data_export_includes_actions_nudges_health_and_workspaces(client: httpx.AsyncClient, app, mailer) -> None:  # type: ignore[no-untyped-def]
    from tests.integration.test_actions import act, refresh, weak_user

    ha = await weak_user(client, mailer, "a@example.com")
    acts = await refresh(client, ha)
    assert (await act(client, ha, acts[0]["id"], "accept")).status_code == 200
    assert (await client.post(f"{API}/nudges/refresh", headers=ha)).status_code == 200
    assert (
        await client.put(f"{API}/notification-prefs", headers=ha, json={"in_app_enabled": True, "max_active": 2})
    ).status_code == 200
    assert (await client.post(f"{API}/health-monitor/check", headers=ha)).status_code == 200
    org = await client.post(f"{API}/orgs", headers=ha, json={"name": "Acme Wealth"})
    secret = org.json()["secret_key"]
    async with await other_client(app) as other:  # another user's actions must never appear
        hb = await weak_user(other, mailer, "b@example.com")
        await refresh(other, hb)

    d = (await client.get(f"{API}/users/me/data-export", headers=ha)).json()
    assert d["format_version"] == "4" and d["finscore_runs"] == []
    assert {a["action"] for a in d["actions"]} == {a["key"] for a in acts}
    accepted = next(a for a in d["actions"] if a["action"] == acts[0]["key"])
    assert accepted["state"] == "accepted" and [h["to"] for h in accepted["history"]][-1] == "accepted"
    assert d["nudges"] and all(n["body"] and not n["body"].startswith("gAAAA") for n in d["nudges"])  # decrypted
    assert d["nudge_preferences"]["max_active"] == 2
    assert d["health_checks"] and d["health_checks"][0]["vitals"]
    assert d["workspace_memberships"] == [
        {"workspace": "Acme Wealth", "role": "owner", "status": "active", "joined_at": d["workspace_memberships"][0]["joined_at"]}
    ]
    blob = str(d)
    assert secret not in blob and "fs_sec_" not in blob and "fs_pub_" not in blob and "b@example.com" not in blob
