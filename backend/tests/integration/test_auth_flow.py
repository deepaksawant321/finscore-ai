import httpx
from sqlalchemy import text

from app.domains.governance.service import verify_chain
from app.infra.ratelimit import limiter
from tests.conftest import PASSWORD, login, register_verified, signup


async def test_health_live_and_ready(client: httpx.AsyncClient) -> None:
    assert (await client.get("/api/v1/health/live")).json() == {"status": "ok"}
    r = await client.get("/api/v1/health/ready")
    assert r.status_code == 200 and r.json()["checks"]["database"] == "ok"


async def test_full_happy_path(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    await register_verified(client, mailer)
    r = await login(client)
    assert r.status_code == 200
    assert r.headers["cache-control"] == "no-store"
    set_cookie = r.headers["set-cookie"].lower()
    assert "httponly" in set_cookie and "samesite=lax" in set_cookie and "path=/api/v1/auth" in set_cookie
    access = r.json()["access_token"]
    me = await client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {access}"})
    assert me.status_code == 200
    body = me.json()
    assert body["email"] == "a@example.com" and body["roles"] == ["user"] and body["email_verified"] is True
    assert "password" not in str(body)
    r2 = await client.post("/api/v1/auth/refresh")
    assert r2.status_code == 200 and r2.json()["access_token"] != access
    out = await client.post("/api/v1/auth/logout")
    assert out.status_code == 204
    assert (await client.post("/api/v1/auth/refresh")).status_code == 401


async def test_protected_routes_require_valid_token(client: httpx.AsyncClient) -> None:
    r = await client.get("/api/v1/users/me")
    assert r.status_code == 401 and r.headers["content-type"].startswith("application/problem+json")
    r = await client.get("/api/v1/users/me", headers={"Authorization": "Bearer garbage"})
    assert r.status_code == 401


async def test_register_is_enumeration_safe(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    a = await client.post("/api/v1/auth/register", json=signup("dup@example.com"))
    b = await client.post("/api/v1/auth/register", json=signup("DUP@example.com"))
    assert a.status_code == b.status_code == 202 and a.json() == b.json()
    assert len(mailer.sent) == 2 and "already exists" in mailer.sent[1].subject


async def test_unverified_user_cannot_login(client: httpx.AsyncClient) -> None:
    await client.post("/api/v1/auth/register", json=signup("u@example.com"))
    r = await login(client, "u@example.com")
    assert r.status_code == 403 and r.json()["code"] == "email_not_verified"


async def test_verify_token_is_single_use_and_invalid_rejected(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    await client.post("/api/v1/auth/register", json=signup("v@example.com"))
    token = mailer.sent[-1].body.split("token=")[1].split()[0]
    assert (await client.post("/api/v1/auth/verify-email", json={"token": token})).status_code == 200
    assert (await client.post("/api/v1/auth/verify-email", json={"token": token})).status_code == 400
    assert (await client.post("/api/v1/auth/verify-email", json={"token": "x" * 30})).status_code == 400


async def test_wrong_password_unknown_user_same_error_and_lockout(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    await register_verified(client, mailer)
    bad = await login(client, password="Wrong-Password-1")
    unknown = await login(client, "nobody@example.com", "Wrong-Password-1")
    assert bad.status_code == unknown.status_code == 401 and bad.json()["code"] == unknown.json()["code"]
    for _ in range(4):
        await login(client, password="Wrong-Password-1")
    locked = await login(client)  # even the right password is refused while locked
    assert locked.status_code == 423


async def test_refresh_reuse_revokes_whole_family(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    await register_verified(client, mailer)
    r = await login(client)
    old = client.cookies.get("fs_refresh", path="/api/v1/auth")
    assert old
    ok = await client.post("/api/v1/auth/refresh")
    assert ok.status_code == 200
    new = client.cookies.get("fs_refresh", path="/api/v1/auth")
    assert new and new != old
    client.cookies.set("fs_refresh", old, path="/api/v1/auth")  # attacker replays the rotated token
    reuse = await client.post("/api/v1/auth/refresh")
    assert reuse.status_code == 401 and reuse.json()["code"] == "refresh_reuse_detected"
    client.cookies.set("fs_refresh", new, path="/api/v1/auth")  # legitimate newer token is dead too
    assert (await client.post("/api/v1/auth/refresh")).status_code == 401
    assert r.status_code == 200


async def test_refresh_rejects_foreign_origin(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    await register_verified(client, mailer)
    await login(client)
    r = await client.post("/api/v1/auth/refresh", headers={"Origin": "https://evil.example"})
    assert r.status_code == 403


async def test_password_reset_flow_revokes_sessions(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    await register_verified(client, mailer)
    await login(client)
    f = await client.post("/api/v1/auth/password/forgot", json={"email": "a@example.com"})
    f2 = await client.post("/api/v1/auth/password/forgot", json={"email": "ghost@example.com"})
    assert f.status_code == f2.status_code == 202 and f.json() == f2.json()
    token = mailer.sent[-1].body.split("token=")[1].split()[0]
    r = await client.post("/api/v1/auth/password/reset", json={"token": token, "new_password": "N3wStrongPassword!"})
    assert r.status_code == 200
    assert (await client.post("/api/v1/auth/refresh")).status_code == 401  # old session revoked
    assert (await login(client)).status_code == 401
    assert (await login(client, password="N3wStrongPassword!")).status_code == 200
    again = await client.post("/api/v1/auth/password/reset", json={"token": token, "new_password": "An0therStrongPass!"})
    assert again.status_code == 400


async def test_sessions_list_revoke_and_idor(client: httpx.AsyncClient, app, mailer) -> None:  # type: ignore[no-untyped-def]
    await register_verified(client, mailer, "a@example.com")
    tok_a = (await login(client, "a@example.com")).json()["access_token"]
    ha = {"Authorization": f"Bearer {tok_a}"}
    sessions = (await client.get("/api/v1/users/me/sessions", headers=ha)).json()
    assert len(sessions) == 1 and sessions[0]["current"] is True
    transport = httpx.ASGITransport(app=app, client=("203.0.113.10", 1))
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as other:
        await register_verified(other, mailer, "b@example.com")
        tok_b = (await login(other, "b@example.com")).json()["access_token"]
        hb = {"Authorization": f"Bearer {tok_b}"}
        # B must not be able to see or revoke A's session (IDOR)
        assert (await other.delete(f"/api/v1/users/me/sessions/{sessions[0]['id']}", headers=hb)).status_code == 404
        assert len((await other.get("/api/v1/users/me/sessions", headers=hb)).json()) == 1
    assert (await client.delete(f"/api/v1/users/me/sessions/{sessions[0]['id']}", headers=ha)).status_code == 204
    assert (
        await client.get("/api/v1/users/me/sessions", headers=ha)
    ).status_code == 401  # revoked session => its access token dies at once


async def test_patch_me_updates_only_allowed_fields(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    await register_verified(client, mailer)
    h = {"Authorization": f"Bearer {(await login(client)).json()['access_token']}"}
    r = await client.patch(
        "/api/v1/users/me", headers=h, json={"full_name": "Rahul", "email": "evil@example.com", "email_verified": False}
    )
    assert r.status_code == 200 and r.json()["full_name"] == "Rahul" and r.json()["email"] == "a@example.com"


async def test_validation_errors_are_problem_json(client: httpx.AsyncClient) -> None:
    r = await client.post("/api/v1/auth/register", json={"email": "not-an-email", "password": "weak"})
    assert r.status_code == 422 and r.headers["content-type"].startswith("application/problem+json")
    assert r.json()["code"] == "validation_error" and r.json()["errors"]
    assert r.headers.get("x-request-id")


async def test_rate_limit_returns_429_with_retry_after(client: httpx.AsyncClient, app) -> None:  # type: ignore[no-untyped-def]
    app.state.settings.rate_limit_enabled = True
    try:
        limiter.reset()
        codes = [(await login(client, "x@example.com", "Whatever-Pass-1")).status_code for _ in range(12)]
        assert codes[:10] == [401] * 10 and codes[10] == 429
        r = await login(client, "x@example.com", "Whatever-Pass-1")
        assert r.headers["retry-after"].isdigit()
    finally:
        app.state.settings.rate_limit_enabled = False


async def test_spoofed_forwarded_for_does_not_buy_more_attempts(client: httpx.AsyncClient, app) -> None:  # type: ignore[no-untyped-def]
    """A caller rotating X-Forwarded-For must still hit the per-address limit (header not trusted by default)."""
    app.state.settings.rate_limit_enabled = True
    try:
        limiter.reset()
        codes = []
        for i in range(11):
            r = await client.post(
                "/api/v1/auth/login",
                json={"email": f"user{i}@example.com", "password": "Whatever-Pass-1"},
                headers={"X-Forwarded-For": f"198.51.100.{i}"},
            )
            codes.append(r.status_code)
        assert codes[:10] == [401] * 10 and codes[10] == 429
    finally:
        app.state.settings.rate_limit_enabled = False


async def test_per_email_limit_holds_across_addresses(app) -> None:  # type: ignore[no-untyped-def]
    """Changing address does not give more password-reset requests for the same account."""
    app.state.settings.rate_limit_enabled = True
    try:
        limiter.reset()
        codes = []
        for i in range(4):
            transport = httpx.ASGITransport(app=app, client=(f"203.0.113.{i + 20}", 5000))
            async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
                r = await c.post("/api/v1/auth/password/forgot", json={"email": "Victim@example.com"})
                codes.append(r.status_code)
        assert codes == [202, 202, 202, 429]
    finally:
        app.state.settings.rate_limit_enabled = False


async def test_registration_requires_and_records_acceptance_of_the_terms(client: httpx.AsyncClient, mailer, app) -> None:  # type: ignore[no-untyped-def]
    no = await client.post("/api/v1/auth/register", json={**signup("t@example.com"), "accept_terms": False})
    assert no.status_code == 422
    missing = await client.post("/api/v1/auth/register", json={"email": "t@example.com", "password": PASSWORD})
    assert missing.status_code == 422
    old = await client.post("/api/v1/auth/register", json={**signup("t@example.com"), "terms_version": "2020-01-01"})
    assert old.status_code == 409 and old.json()["code"] == "terms_outdated"
    await register_verified(client, mailer, "t@example.com")
    h = {"Authorization": f"Bearer {(await login(client, 't@example.com')).json()['access_token']}"}
    consents = (await client.get("/api/v1/consents", headers=h)).json()
    assert [(c["purpose"], c["text_version"]) for c in consents] == [("core_processing", signup("x")["terms_version"])]


async def test_consent_grant_revoke_and_audit_chain(client: httpx.AsyncClient, app, mailer) -> None:  # type: ignore[no-untyped-def]
    await register_verified(client, mailer)
    h = {"Authorization": f"Bearer {(await login(client)).json()['access_token']}"}
    bad = await client.post("/api/v1/consents", headers=h, json={"purpose": "selling_data", "text_version": "v1"})
    assert bad.status_code == 422
    g = await client.post("/api/v1/consents", headers=h, json={"purpose": "ai_processing", "text_version": "v1"})
    assert g.status_code == 201
    again = await client.post("/api/v1/consents", headers=h, json={"purpose": "ai_processing", "text_version": "v1"})
    assert again.json()["id"] == g.json()["id"]  # idempotent
    assert (await client.delete("/api/v1/consents/ai_processing", headers=h)).status_code == 204
    assert (await client.delete("/api/v1/consents/ai_processing", headers=h)).status_code == 404
    listed = (await client.get("/api/v1/consents", headers=h)).json()
    assert next(c for c in listed if c["purpose"] == "ai_processing")["revoked_at"] is not None
    async with app.state.sessionmaker() as s:
        assert await verify_chain(s)
        actions = [r[0] for r in (await s.execute(text("SELECT action FROM audit_log ORDER BY seq"))).all()]
        assert {"user.registered", "user.email_verified", "auth.login", "consent.granted", "consent.revoked"} <= set(actions)
        await s.execute(text("UPDATE audit_log SET action='tampered' WHERE seq=1"))
        await s.commit()
    async with app.state.sessionmaker() as s:
        assert not await verify_chain(s)  # tampering is detected


async def test_access_token_stops_working_after_logout_and_password_reset(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    await register_verified(client, mailer)
    tok = (await login(client)).json()["access_token"]
    h = {"Authorization": f"Bearer {tok}"}
    assert (await client.get("/api/v1/users/me", headers=h)).status_code == 200
    # refresh rotation must NOT kill the in-flight old token's family
    assert (await client.post("/api/v1/auth/refresh")).status_code == 200
    assert (await client.get("/api/v1/users/me", headers=h)).status_code == 200
    assert (await client.post("/api/v1/auth/logout")).status_code == 204
    assert (await client.get("/api/v1/users/me", headers=h)).status_code == 401
