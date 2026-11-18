import httpx
from sqlalchemy import text

from tests.integration.test_intelligence import auth_client

API = "/api/v1"
FACTS = {"age": 32, "annual_income": 1_200_000, "monthly_expenses": 50_000, "liquid_assets": 300_000, "monthly_emi_total": 10_000}


def bearer(key: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {key}"}


async def make_org(client: httpx.AsyncClient, h: dict[str, str], name: str = "Acme Wealth") -> tuple[str, str]:
    r = await client.post(f"{API}/orgs", headers=h, json={"name": name})
    assert r.status_code == 201, r.text
    return r.json()["org"]["id"], r.json()["secret_key"]


async def sql(app, query: str, **params) -> None:  # type: ignore[no-untyped-def]
    async with app.state.sessionmaker() as s:
        await s.execute(text(query), params)
        await s.commit()


async def set_plan(app, org: str, plan: str) -> None:  # type: ignore[no-untyped-def]
    await sql(app, "UPDATE organizations SET plan_key = :p WHERE id = :o", p=plan, o=org)


async def finish_checklist(client: httpx.AsyncClient, h: dict[str, str], org: str) -> None:
    base = f"{API}/orgs/{org}"
    assert (await client.put(f"{base}/connectors/aa", headers=h, json={"connected": True})).status_code == 200
    brand = {"name": "Acme", "brand": "#E11D48", "accent": "#4F46E5", "radius": 16, "font": "dm", "powered_by": True}
    assert (await client.put(f"{base}/branding", headers=h, json=brand)).status_code == 200
    assert (await client.post(f"{base}/snippet-copied", headers=h)).status_code == 200


# ---------------------------------------------------------------- create, tenancy, permissions
async def test_create_org_makes_you_owner_with_sandbox_keys_and_the_secret_is_shown_once(
    client: httpx.AsyncClient, mailer
) -> None:  # type: ignore[no-untyped-def]
    h = await auth_client(client, mailer)
    r = await client.post(f"{API}/orgs", headers=h, json={"name": "Acme Wealth"})
    assert r.status_code == 201
    org, secret = r.json()["org"], r.json()["secret_key"]
    assert (
        org["my_role"] == "owner"
        and org["plan_key"] == "starter"
        and org["environment"] == "sandbox"
        and org["slug"] == "acme-wealth"
    )
    assert secret.startswith("fs_sec_test_") and org["plans_are_placeholder"] is True
    assert [c["id"] for c in org["checklist"] if c["done"]] == ["workspace", "sandbox_key"]
    listed = (await client.get(f"{API}/orgs/{org['id']}/api-keys", headers=h)).json()
    assert {(k["kind"], k["environment"]) for k in listed} == {("publishable", "test"), ("secret", "test")}
    assert secret not in str(listed) and any(k["display"].startswith("fs_sec_test_") and "…" in k["display"] for k in listed)
    again = await client.post(f"{API}/orgs", headers=h, json={"name": "Acme Wealth"})
    assert again.json()["org"]["slug"] != "acme-wealth"  # slugs stay unique


async def test_another_tenant_cannot_see_or_touch_an_org(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    a = await auth_client(client, mailer, "a@example.com")
    b = await auth_client(client, mailer, "b@example.com")
    org, _ = await make_org(client, a)
    assert (await client.get(f"{API}/orgs", headers=b)).json() == []
    for method, path, body in [
        ("GET", f"/orgs/{org}", None), ("GET", f"/orgs/{org}/members", None), ("GET", f"/orgs/{org}/billing", None),
        ("GET", f"/orgs/{org}/api-keys", None), ("PUT", f"/orgs/{org}/modules", {"modules": ["score"]}),
        ("POST", f"/orgs/{org}/members", {"email": "x@example.com", "role": "viewer"}),
    ]:  # fmt: skip
        r = await client.request(method, f"{API}{path}", headers=b, json=body)
        assert r.status_code == 404, (path, r.status_code)  # not 403: the org must not be discoverable
    assert (await client.get(f"{API}/orgs/{org}")).status_code == 401


async def test_roles_limit_what_a_member_can_do(client: httpx.AsyncClient, mailer, app) -> None:  # type: ignore[no-untyped-def]
    a = await auth_client(client, mailer, "a@example.com")
    org, _ = await make_org(client, a)
    await set_plan(app, org, "growth")
    viewer_h = await auth_client(client, mailer, "v@example.com")
    r = await client.post(f"{API}/orgs/{org}/members", headers=a, json={"email": "v@example.com", "role": "viewer"})
    assert r.status_code == 201
    token = mailer.sent[-1].body.split("token=")[1].split()[0]
    assert (await client.post(f"{API}/orgs/invites/accept", headers=viewer_h, json={"token": token})).json()[
        "my_role"
    ] == "viewer"
    base = f"{API}/orgs/{org}"
    assert (await client.get(base, headers=viewer_h)).json()["permissions"] == ["scores.view"]
    assert (await client.get(f"{base}/members", headers=viewer_h)).status_code == 200  # everyone can see the team
    for method, path, body in [
        ("POST", "/members", {"email": "z@example.com", "role": "viewer"}), ("GET", "/api-keys", None), ("GET", "/billing", None),
        ("PUT", "/modules", {"modules": ["score"]}), ("POST", "/api-keys/rotate", {"environment": "test"}),
        ("PUT", "/billing/plan", {"plan_key": "starter", "cycle": "monthly"}),
    ]:  # fmt: skip
        assert (await client.request(method, f"{base}{path}", headers=viewer_h, json=body)).status_code == 403, path


# ---------------------------------------------------------------- team
async def test_invites_enforce_seats_duplicates_and_the_invitee_address(client: httpx.AsyncClient, mailer, app) -> None:  # type: ignore[no-untyped-def]
    a = await auth_client(client, mailer, "a@example.com")
    org, _ = await make_org(client, a)
    base = f"{API}/orgs/{org}"
    full = await client.post(f"{base}/members", headers=a, json={"email": "p@example.com", "role": "analyst"})
    assert full.status_code == 409 and full.json()["code"] == "seat_limit"  # Starter has one seat: the owner
    await set_plan(app, org, "growth")
    ok = await client.post(f"{base}/members", headers=a, json={"email": "P@Example.com", "role": "analyst"})
    assert ok.status_code == 201 and ok.json()["email"] == "p@example.com" and ok.json()["status"] == "invited"
    assert (await client.post(f"{base}/members", headers=a, json={"email": "p@example.com", "role": "viewer"})).json()[
        "code"
    ] == "already_member"
    assert (await client.post(f"{base}/members", headers=a, json={"email": "q@example.com", "role": "owner"})).status_code == 422
    mail = mailer.sent[-1] if mailer.sent[-1].to == "p@example.com" else next(m for m in mailer.sent if m.to == "p@example.com")
    token = mail.body.split("token=")[1].split()[0]
    stranger = await auth_client(client, mailer, "stranger@example.com")
    assert (
        await client.post(f"{API}/orgs/invites/accept", headers=stranger, json={"token": token})
    ).status_code == 404  # wrong address
    p = await auth_client(client, mailer, "p@example.com")
    joined = await client.post(f"{API}/orgs/invites/accept", headers=p, json={"token": token})
    assert joined.status_code == 200 and joined.json()["my_role"] == "analyst"
    assert (await client.post(f"{API}/orgs/invites/accept", headers=p, json={"token": token})).status_code == 404  # single use
    for i in range(3):
        assert (
            await client.post(f"{base}/members", headers=a, json={"email": f"s{i}@example.com", "role": "viewer"})
        ).status_code == 201
    over = await client.post(f"{base}/members", headers=a, json={"email": "s9@example.com", "role": "viewer"})
    assert over.status_code == 409 and "5 seats" in over.json()["title"]


async def test_expired_invites_are_refused(client: httpx.AsyncClient, mailer, app) -> None:  # type: ignore[no-untyped-def]
    a = await auth_client(client, mailer, "a@example.com")
    org, _ = await make_org(client, a)
    await set_plan(app, org, "growth")
    await client.post(f"{API}/orgs/{org}/members", headers=a, json={"email": "late@example.com", "role": "viewer"})
    token = mailer.sent[-1].body.split("token=")[1].split()[0]
    await sql(app, "UPDATE org_members SET invite_expires_at = now() - interval '1 day' WHERE email = 'late@example.com'")
    late = await auth_client(client, mailer, "late@example.com")
    assert (await client.post(f"{API}/orgs/invites/accept", headers=late, json={"token": token})).status_code == 404


async def test_owner_is_protected_and_roles_can_change_and_people_can_be_removed(client: httpx.AsyncClient, mailer, app) -> None:  # type: ignore[no-untyped-def]
    a = await auth_client(client, mailer, "a@example.com")
    org, _ = await make_org(client, a)
    await set_plan(app, org, "growth")
    base = f"{API}/orgs/{org}"
    m = (await client.post(f"{base}/members", headers=a, json={"email": "p@example.com", "role": "viewer"})).json()
    owner = next(x for x in (await client.get(f"{base}/members", headers=a)).json() if x["role"] == "owner")
    assert owner["is_you"] is True
    assert (await client.patch(f"{base}/members/{owner['id']}", headers=a, json={"role": "viewer"})).json()[
        "code"
    ] == "owner_locked"
    assert (await client.delete(f"{base}/members/{owner['id']}", headers=a)).status_code == 409
    assert (await client.patch(f"{base}/members/{m['id']}", headers=a, json={"role": "admin"})).json()["role"] == "admin"
    assert (await client.delete(f"{base}/members/{m['id']}", headers=a)).status_code == 204
    assert (await client.delete(f"{base}/members/{m['id']}", headers=a)).status_code == 404
    assert len((await client.get(f"{base}/members", headers=a)).json()) == 1


# ---------------------------------------------------------------- settings and go-live
async def test_branding_modules_and_plan_limits(client: httpx.AsyncClient, mailer, app) -> None:  # type: ignore[no-untyped-def]
    a = await auth_client(client, mailer, "a@example.com")
    org, _ = await make_org(client, a)
    base = f"{API}/orgs/{org}"
    assert (await client.get(base, headers=a)).json()["branding"] is None
    bad = await client.put(f"{base}/branding", headers=a, json={"name": "A", "brand": "red", "accent": "#4F46E5", "radius": 16})
    assert bad.status_code == 422
    brand = {"name": "Acme", "brand": "#E11D48", "accent": "#4F46E5", "radius": 16, "font": "dm", "powered_by": True}
    saved = await client.put(f"{base}/branding", headers=a, json=brand)
    assert saved.json()["branding"] == brand
    assert (await client.put(f"{base}/branding", headers=a, json={**brand, "powered_by": False})).json()["code"] == "plan_limit"
    assert (await client.delete(f"{base}/branding", headers=a)).json()["branding"] is None
    assert (await client.put(f"{base}/modules", headers=a, json={"modules": ["score", "coach"]})).json()[
        "code"
    ] == "plan_limit"  # Starter: 1
    await set_plan(app, org, "growth")
    assert (await client.put(f"{base}/modules", headers=a, json={"modules": ["score", "coach", "sim"]})).status_code == 200
    assert (await client.put(f"{base}/modules", headers=a, json={"modules": ["score", "coach", "sim", "dna"]})).status_code == 403
    assert (await client.put(f"{base}/modules", headers=a, json={"modules": ["nope"]})).status_code == 422
    assert (await client.put(f"{base}/connectors/zzz", headers=a, json={"connected": True})).status_code == 422
    await set_plan(app, org, "enterprise")
    assert (await client.put(f"{base}/branding", headers=a, json={**brand, "powered_by": False})).status_code == 200


async def test_go_live_needs_a_paid_plan_and_a_finished_checklist_and_shows_the_live_key_once(
    client: httpx.AsyncClient, mailer, app
) -> None:  # type: ignore[no-untyped-def]
    a = await auth_client(client, mailer, "a@example.com")
    org, _ = await make_org(client, a)
    base = f"{API}/orgs/{org}"
    assert (await client.put(f"{base}/environment", headers=a, json={"environment": "live"})).json()[
        "code"
    ] == "plan_limit"  # Starter is sandbox only
    await set_plan(app, org, "growth")
    early = await client.put(f"{base}/environment", headers=a, json={"environment": "live"})
    assert early.status_code == 409 and early.json()["code"] == "checklist_incomplete"
    await finish_checklist(client, a, org)
    live = await client.put(f"{base}/environment", headers=a, json={"environment": "live"})
    assert (
        live.status_code == 200
        and live.json()["org"]["environment"] == "live"
        and live.json()["secret_key"].startswith("fs_sec_live_")
    )
    assert all(c["done"] for c in live.json()["org"]["checklist"])
    back = await client.put(f"{base}/environment", headers=a, json={"environment": "sandbox"})
    assert back.json()["org"]["environment"] == "sandbox" and back.json()["secret_key"] is None
    again = await client.put(f"{base}/environment", headers=a, json={"environment": "live"})
    assert again.json()["secret_key"] is None  # already issued; only a rotation produces another


# ---------------------------------------------------------------- keys and the partner API
async def test_rotation_keeps_the_old_key_for_a_day_then_it_stops_and_revocation_is_immediate(
    client: httpx.AsyncClient, mailer, app
) -> None:  # type: ignore[no-untyped-def]
    a = await auth_client(client, mailer, "a@example.com")
    org, old = await make_org(client, a)
    base = f"{API}/orgs/{org}"
    assert (await client.get(f"{API}/partner/me", headers=bearer(old))).status_code == 200
    rot = await client.post(f"{base}/api-keys/rotate", headers=a, json={"environment": "test"})
    new = rot.json()["secret_key"]
    assert rot.status_code == 201 and new != old
    assert (await client.get(f"{API}/partner/me", headers=bearer(old))).status_code == 200  # grace period
    assert (await client.get(f"{API}/partner/me", headers=bearer(new))).status_code == 200
    await sql(app, "UPDATE api_keys SET expires_at = now() - interval '1 minute' WHERE expires_at IS NOT NULL")
    assert (await client.get(f"{API}/partner/me", headers=bearer(old))).status_code == 401
    assert (await client.post(f"{base}/api-keys/rotate", headers=a, json={"environment": "live"})).json()["code"] == "not_live"
    new_id = rot.json()["key"]["id"]
    assert (await client.delete(f"{base}/api-keys/{new_id}", headers=a)).status_code == 204
    assert (await client.get(f"{API}/partner/me", headers=bearer(new))).status_code == 401
    assert (await client.delete(f"{base}/api-keys/{new_id}", headers=a)).status_code == 404


async def test_partner_api_authenticates_scores_and_meters(client: httpx.AsyncClient, mailer, app) -> None:  # type: ignore[no-untyped-def]
    a = await auth_client(client, mailer, "a@example.com")
    org, key = await make_org(client, a)
    assert (await client.get(f"{API}/partner/me")).status_code == 401
    assert (await client.get(f"{API}/partner/me", headers=bearer("fs_sec_test_nope"))).status_code == 401
    pub = next(k for k in (await client.get(f"{API}/orgs/{org}/api-keys", headers=a)).json() if k["kind"] == "publishable")[
        "display"
    ]
    assert (await client.get(f"{API}/partner/me", headers=bearer(pub))).json()["code"] == "wrong_key_type"
    assert (
        await client.get(f"{API}/partner/me", headers=bearer(a["Authorization"].split()[1]))
    ).status_code == 401  # a login token is not an API key
    r = await client.post(f"{API}/partner/scores", headers=bearer(key), json={"facts": FACTS})
    assert r.status_code == 200, r.text
    s = r.json()
    assert s["environment"] == "test" and 300 <= float(s["overall"]) <= 900 and s["pillars"] and s["official"] is False
    assert (await client.post(f"{API}/partner/scores", headers=bearer(key), json={"facts": FACTS})).status_code == 200
    me = (await client.get(f"{API}/partner/me", headers=bearer(key))).json()
    assert me["scores_used"] == 2 and me["scores_limit"] == 100 and me["plan"] == "Starter"
    assert (await client.get(f"{API}/orgs/{org}", headers=a)).json()["usage"]["scores_used"] == 2
    # rejected requests are not charged
    assert (await client.post(f"{API}/partner/scores", headers=bearer(key), json={"facts": {"nonsense": 1}})).status_code == 422
    assert (
        await client.post(f"{API}/partner/scores", headers=bearer(key), json={"facts": {"age": 30}})
    ).status_code == 422  # too little to score
    assert (await client.get(f"{API}/partner/me", headers=bearer(key))).json()["scores_used"] == 2
    # nothing about the partner's customer is stored
    async with app.state.sessionmaker() as sess:
        assert (await sess.execute(text("SELECT count(*) FROM score_runs"))).scalar_one() == 0


async def test_starter_quota_is_a_hard_cap(client: httpx.AsyncClient, mailer, app) -> None:  # type: ignore[no-untyped-def]
    a = await auth_client(client, mailer, "a@example.com")
    org, key = await make_org(client, a)
    await sql(app, "INSERT INTO usage_counters VALUES (:o, to_char(now(), 'YYYY-MM'), 'test', 'scores', 99)", o=org)
    assert (
        await client.post(f"{API}/partner/scores", headers=bearer(key), json={"facts": FACTS})
    ).status_code == 200  # the 100th
    full = await client.post(f"{API}/partner/scores", headers=bearer(key), json={"facts": FACTS})
    assert full.status_code == 429 and full.json()["code"] == "quota_exceeded"
    assert (await client.get(f"{API}/partner/me", headers=bearer(key))).json()[
        "scores_used"
    ] == 100  # the refused call did not count


async def test_live_keys_only_work_while_live_and_live_usage_is_billed_separately(client: httpx.AsyncClient, mailer, app) -> None:  # type: ignore[no-untyped-def]
    a = await auth_client(client, mailer, "a@example.com")
    org, test_key = await make_org(client, a)
    await set_plan(app, org, "growth")
    await finish_checklist(client, a, org)
    live_key = (await client.put(f"{API}/orgs/{org}/environment", headers=a, json={"environment": "live"})).json()["secret_key"]
    assert (await client.post(f"{API}/partner/scores", headers=bearer(live_key), json={"facts": FACTS})).json()[
        "environment"
    ] == "live"
    assert (await client.post(f"{API}/partner/scores", headers=bearer(test_key), json={"facts": FACTS})).json()[
        "environment"
    ] == "test"
    usage = (await client.get(f"{API}/orgs/{org}", headers=a)).json()["usage"]
    assert (usage["scores_used"], usage["live_calls"], usage["sandbox_calls"]) == (
        1,
        1,
        1,
    )  # only live counts toward Growth's quota
    await client.put(f"{API}/orgs/{org}/environment", headers=a, json={"environment": "sandbox"})
    off = await client.get(f"{API}/partner/me", headers=bearer(live_key))
    assert off.status_code == 403 and off.json()["code"] == "live_disabled"
    assert (await client.get(f"{API}/partner/me", headers=bearer(test_key))).status_code == 200


# ---------------------------------------------------------------- billing
async def test_billing_estimate_overage_and_invoice(client: httpx.AsyncClient, mailer, app) -> None:  # type: ignore[no-untyped-def]
    a = await auth_client(client, mailer, "a@example.com")
    org, _ = await make_org(client, a)
    base = f"{API}/orgs/{org}"
    b = (await client.get(f"{base}/billing", headers=a)).json()
    assert b["payments_enabled"] is False and b["plans_are_placeholder"] is True and b["estimate"]["total"] == "0.00"
    assert [p["key"] for p in b["plans"]] == ["starter", "growth", "enterprise"]
    # No payment provider yet: a priced plan cannot be self-served (it would grant paid quota for free)
    refused = await client.put(f"{base}/billing/plan", headers=a, json={"plan_key": "growth", "cycle": "monthly"})
    assert refused.status_code == 402 and refused.json()["code"] == "payment_required"
    assert (await client.get(f"{base}/billing", headers=a)).json()["plan_key"] == "starter"
    asked = await client.post(f"{base}/billing/contact-sales", headers=a, json={"plan_key": "growth", "cycle": "monthly"})
    assert asked.status_code == 202
    async with app.state.sessionmaker() as s:
        q = "SELECT meta FROM audit_log WHERE action = 'sales.requested' ORDER BY seq DESC LIMIT 1"
        assert (await s.execute(text(q))).scalar_one()["wanted"] == "growth"
    await set_plan(app, org, "growth")  # what staff do once payment is arranged
    up = (await client.get(f"{base}/billing", headers=a)).json()
    assert up["plan_key"] == "growth" and up["estimate"]["total"] == "29498.82"
    yearly = await client.put(f"{base}/billing/plan", headers=a, json={"plan_key": "growth", "cycle": "yearly"})
    assert (
        yearly.json()["billing_cycle"] == "monthly" and yearly.json()["pending_change"]["cycle"] == "yearly"
    )  # cheaper cycle waits
    await sql(app, "INSERT INTO usage_counters VALUES (:o, to_char(now(), 'YYYY-MM'), 'live', 'scores', 25010)", o=org)
    est = (await client.get(f"{base}/billing", headers=a)).json()["estimate"]
    assert est["overage_scores"] == 10 and est["overage_amount"] == "8.00" and est["subtotal"] == "25007.00"
    inv = await client.post(f"{base}/billing/invoices", headers=a, json={})
    assert inv.status_code == 201 and inv.json()["status"] == "open" and inv.json()["total"] == "29508.26"
    assert inv.json()["number"].startswith("INV-")
    same = await client.post(f"{base}/billing/invoices", headers=a, json={})
    assert same.json()["id"] == inv.json()["id"]  # one invoice per month
    assert len((await client.get(f"{base}/billing", headers=a)).json()["invoices"]) == 1
    assert (await client.post(f"{base}/billing/invoices", headers=a, json={"period": "2999-01"})).status_code == 422


async def test_downgrade_is_scheduled_blocked_when_it_does_not_fit_and_applies_when_due(
    client: httpx.AsyncClient, mailer, app
) -> None:  # type: ignore[no-untyped-def]
    a = await auth_client(client, mailer, "a@example.com")
    org, _ = await make_org(client, a)
    base = f"{API}/orgs/{org}"
    await set_plan(app, org, "growth")
    await client.post(f"{base}/members", headers=a, json={"email": "p@example.com", "role": "viewer"})
    blocked = await client.put(f"{base}/billing/plan", headers=a, json={"plan_key": "starter", "cycle": "monthly"})
    assert blocked.status_code == 409 and blocked.json()["code"] == "plan_conflict"  # 2 people, Starter has 1 seat
    m = next(x for x in (await client.get(f"{base}/members", headers=a)).json() if x["email"] == "p@example.com")
    await client.delete(f"{base}/members/{m['id']}", headers=a)
    sched = await client.put(f"{base}/billing/plan", headers=a, json={"plan_key": "starter", "cycle": "monthly"})
    assert (
        sched.json()["plan_key"] == "growth" and sched.json()["pending_change"]["plan_key"] == "starter"
    )  # still Growth until the period ends
    cancel = await client.put(f"{base}/billing/plan", headers=a, json={"plan_key": "growth", "cycle": "monthly"})
    assert cancel.json()["pending_change"] is None
    await client.put(f"{base}/billing/plan", headers=a, json={"plan_key": "starter", "cycle": "monthly"})
    await sql(app, "UPDATE organizations SET pending_effective_at = now() - interval '1 hour' WHERE id = :o", o=org)
    assert (await client.get(base, headers=a)).json()["plan_key"] == "starter"  # applied on the first request after it is due
    assert (await client.get(base, headers=a)).json()["pending_change"] is None


async def test_live_workspace_cannot_schedule_a_sandbox_only_plan_and_enterprise_is_sales_led(
    client: httpx.AsyncClient, mailer, app
) -> None:  # type: ignore[no-untyped-def]
    a = await auth_client(client, mailer, "a@example.com")
    org, _ = await make_org(client, a)
    base = f"{API}/orgs/{org}"
    await set_plan(app, org, "growth")
    await finish_checklist(client, a, org)
    await client.put(f"{base}/environment", headers=a, json={"environment": "live"})
    live = await client.put(f"{base}/billing/plan", headers=a, json={"plan_key": "starter", "cycle": "monthly"})
    assert live.status_code == 409 and "sandbox" in live.json()["title"].lower()
    ent = await client.put(f"{base}/billing/plan", headers=a, json={"plan_key": "enterprise", "cycle": "monthly"})
    assert ent.status_code == 409 and ent.json()["code"] == "contact_sales"
    assert (await client.post(f"{base}/billing/contact-sales", headers=a)).status_code == 202
    assert (await client.put(f"{base}/billing/plan", headers=a, json={"plan_key": "gold", "cycle": "monthly"})).status_code == 422
    await set_plan(app, org, "enterprise")
    assert (await client.post(f"{base}/billing/invoices", headers=a, json={})).json()["code"] == "contact_sales"


# ---------------------------------------------------------------- audit trail
async def test_activity_records_who_did_what_without_secrets(client: httpx.AsyncClient, mailer, app) -> None:  # type: ignore[no-untyped-def]
    a = await auth_client(client, mailer, "a@example.com")
    org, secret = await make_org(client, a)
    await set_plan(app, org, "growth")
    await client.post(f"{API}/orgs/{org}/members", headers=a, json={"email": "p@example.com", "role": "viewer"})
    await client.post(f"{API}/orgs/{org}/api-keys/rotate", headers=a, json={"environment": "test"})
    acts = (await client.get(f"{API}/orgs/{org}/activity", headers=a)).json()
    assert [x["action"] for x in acts][:3] == ["apikey.rotated", "member.invited", "org.created"]
    assert acts[0]["actor_email"] == "a@example.com"
    blob = str(acts)
    assert secret not in blob and "p@example.com" not in blob and "fs_sec_" not in blob  # no keys, no invitee address


async def test_partner_api_is_rate_limited_per_key_on_every_plan(client: httpx.AsyncClient, mailer, app) -> None:  # type: ignore[no-untyped-def]
    a = await auth_client(client, mailer, "a@example.com")
    org, key = await make_org(client, a)
    _, other_key = await make_org(client, a, "Beta Wealth")
    await set_plan(app, org, "growth")  # a plan with no hard monthly cap still has a burst limit
    s = app.state.settings
    old = (s.rate_limit_enabled, s.partner_rate_per_key_per_minute)
    s.rate_limit_enabled, s.partner_rate_per_key_per_minute = True, 3
    try:
        codes = [(await client.get(f"{API}/partner/me", headers=bearer(key))).status_code for _ in range(4)]
        assert codes == [200, 200, 200, 429]
        r = await client.post(f"{API}/partner/scores", headers=bearer(key), json={"facts": FACTS})
        assert r.status_code == 429 and r.json()["code"] == "rate_limited" and int(r.headers["Retry-After"]) >= 1
        assert (await client.get(f"{API}/partner/me", headers=bearer(other_key))).status_code == 200  # limit is per key
    finally:
        s.rate_limit_enabled, s.partner_rate_per_key_per_minute = old
    assert (await client.get(f"{API}/orgs/{org}", headers=a)).json()["usage"]["scores_used"] == 0  # throttled calls not billed


async def test_partner_api_limits_one_address_trying_many_keys(client: httpx.AsyncClient, app) -> None:  # type: ignore[no-untyped-def]
    s = app.state.settings
    old = (s.rate_limit_enabled, s.partner_rate_per_ip_per_minute)
    s.rate_limit_enabled, s.partner_rate_per_ip_per_minute = True, 5
    try:
        codes = [(await client.get(f"{API}/partner/me", headers=bearer(f"fs_sec_test_guess{i}"))).status_code for i in range(6)]
        assert codes == [401] * 5 + [429]
    finally:
        s.rate_limit_enabled, s.partner_rate_per_ip_per_minute = old
