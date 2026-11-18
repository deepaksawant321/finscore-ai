import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Response

from app.api.deps import ClientDep, PrincipalDep, SessionDep, SettingsDep, get_mailer
from app.api.v1 import schemas_org as o
from app.domains.organizations import plans as P
from app.domains.organizations.models import ApiKey, Invoice, Organization, OrgMember
from app.domains.organizations.service import Ctx, OrgService, billable_env, period_of
from app.infra.mailer import Mailer

router = APIRouter(tags=["organizations"])


def org_service(session: SessionDep, settings: SettingsDep, mailer: Annotated[Mailer, Depends(get_mailer)]) -> OrgService:
    return OrgService(session, settings, mailer)


OrgDep = Annotated[OrgService, Depends(org_service)]


# ---------------------------------------------------------------- builders
def _pending(org: Organization) -> o.PendingPlan | None:
    if org.pending_plan_key and org.pending_effective_at:
        return o.PendingPlan(plan_key=org.pending_plan_key, cycle=org.pending_cycle, effective_at=org.pending_effective_at)
    return None


def _branding(org: Organization) -> dict[str, object] | None:
    return dict(org.branding) if org.branding else None


async def _org_out(svc: OrgService, ctx: Ctx) -> o.OrgOut:
    org, plan = ctx.org, ctx.plan
    use = await svc.usage(org)
    env = billable_env(plan)
    return o.OrgOut(
        id=org.id, name=org.name, slug=org.slug, region=org.region, plan_key=org.plan_key, billing_cycle=org.billing_cycle,
        pending_change=_pending(org), environment=org.environment, went_live_at=org.went_live_at, branding=_branding(org),
        modules=list(org.modules), connectors=dict(org.connectors),
        checklist=[o.ChecklistItem(**c) for c in await svc.checklist(org)],
        my_role=ctx.member.role, permissions=P.permissions_for(ctx.member.role),
        entitlements=o.Entitlements(
            plan_name=plan.name, scores_per_month=plan.scores_per_month, hard_cap=plan.hard_cap, seats=plan.seats, domains=plan.domains,
            max_modules=plan.max_modules, live_allowed=plan.live_allowed, can_remove_powered_by=plan.can_remove_powered_by,
        ),
        usage=o.UsageSummary(
            period=period_of(datetime.now(UTC)), scores_used=use.get(f"scores:{env}", 0),
            scores_limit=plan.scores_per_month, seats_used=await svc.seats_in_use(org.id), seats_limit=plan.seats,
            sandbox_calls=use.get("scores:test", 0), live_calls=use.get("scores:live", 0),
        ),
    )  # fmt: skip


def _key_out(k: ApiKey) -> o.ApiKeyOut:
    display = k.public_value or f"{k.prefix}…{k.last4}"
    return o.ApiKeyOut(id=k.id, kind=k.kind, environment=k.environment, display=display, created_at=k.created_at,
                       expires_at=k.expires_at, last_used_at=k.last_used_at)  # fmt: skip


def _inv_out(i: Invoice) -> o.InvoiceOut:
    return o.InvoiceOut.model_validate(i, from_attributes=True)


def _member_out(m: OrgMember, me: uuid.UUID) -> o.MemberOut:
    return o.MemberOut(
        id=m.id, email=m.email, role=m.role, status=m.status, last_active_at=m.last_active_at, is_you=m.user_id == me
    )


# ---------------------------------------------------------------- organisations
@router.get("/orgs", response_model=list[o.OrgSummary])
async def list_orgs(p: PrincipalDep, svc: OrgDep) -> list[o.OrgSummary]:
    return [
        o.OrgSummary(id=org.id, name=org.name, slug=org.slug, my_role=m.role, plan_key=org.plan_key, environment=org.environment)
        for org, m in await svc.mine(p.user_id)
    ]


@router.post("/orgs", response_model=o.OrgCreatedOut, status_code=201)
async def create_org(body: o.OrgCreateIn, p: PrincipalDep, svc: OrgDep, client: ClientDep) -> o.OrgCreatedOut:
    org, secret = await svc.create(p.user_id, body.name, client.request_id)
    return o.OrgCreatedOut(org=await _org_out(svc, await svc.context(p.user_id, org.id)), secret_key=secret)


# declared before the /orgs/{org_id} routes so "invites" is never read as an id
@router.post("/orgs/invites/accept", response_model=o.OrgSummary)
async def accept_invite(body: o.AcceptInviteIn, p: PrincipalDep, svc: OrgDep, client: ClientDep) -> o.OrgSummary:
    org, m = await svc.accept_invite(p.user_id, body.token, client.request_id)
    return o.OrgSummary(
        id=org.id, name=org.name, slug=org.slug, my_role=m.role, plan_key=org.plan_key, environment=org.environment
    )


@router.get("/orgs/{org_id}", response_model=o.OrgOut)
async def get_org(org_id: uuid.UUID, p: PrincipalDep, svc: OrgDep) -> o.OrgOut:
    return await _org_out(svc, await svc.context(p.user_id, org_id))


@router.patch("/orgs/{org_id}", response_model=o.OrgOut)
async def rename_org(org_id: uuid.UUID, body: o.OrgPatchIn, p: PrincipalDep, svc: OrgDep, client: ClientDep) -> o.OrgOut:
    ctx = await svc.context(p.user_id, org_id, "branding.edit")
    await svc.update_name(ctx, body.name, client.request_id, p.user_id)
    return await _org_out(svc, ctx)


@router.put("/orgs/{org_id}/branding", response_model=o.OrgOut)
async def put_branding(org_id: uuid.UUID, body: o.BrandingIn, p: PrincipalDep, svc: OrgDep, client: ClientDep) -> o.OrgOut:
    ctx = await svc.context(p.user_id, org_id, "branding.edit")
    await svc.set_branding(ctx, body.model_dump(), client.request_id, p.user_id)
    return await _org_out(svc, ctx)


@router.delete("/orgs/{org_id}/branding", response_model=o.OrgOut)
async def reset_branding(org_id: uuid.UUID, p: PrincipalDep, svc: OrgDep, client: ClientDep) -> o.OrgOut:
    ctx = await svc.context(p.user_id, org_id, "branding.edit")
    await svc.set_branding(ctx, None, client.request_id, p.user_id)
    return await _org_out(svc, ctx)


@router.put("/orgs/{org_id}/modules", response_model=o.OrgOut)
async def put_modules(org_id: uuid.UUID, body: o.ModulesIn, p: PrincipalDep, svc: OrgDep, client: ClientDep) -> o.OrgOut:
    ctx = await svc.context(p.user_id, org_id, "branding.edit")
    await svc.set_modules(ctx, body.modules, client.request_id, p.user_id)
    return await _org_out(svc, ctx)


@router.put("/orgs/{org_id}/connectors/{connector}", response_model=o.OrgOut)
async def put_connector(
    org_id: uuid.UUID, connector: str, body: o.ConnectorIn, p: PrincipalDep, svc: OrgDep, client: ClientDep
) -> o.OrgOut:
    ctx = await svc.context(p.user_id, org_id, "branding.edit")
    await svc.set_connector(ctx, connector, body.connected, client.request_id, p.user_id)
    return await _org_out(svc, ctx)


@router.post("/orgs/{org_id}/snippet-copied", response_model=o.OrgOut)
async def snippet_copied(org_id: uuid.UUID, p: PrincipalDep, svc: OrgDep) -> o.OrgOut:
    ctx = await svc.context(p.user_id, org_id, "branding.edit")
    await svc.mark_snippet_copied(ctx)
    return await _org_out(svc, ctx)


@router.put("/orgs/{org_id}/environment", response_model=o.GoLiveOut)
async def put_environment(
    org_id: uuid.UUID, body: o.EnvironmentIn, p: PrincipalDep, svc: OrgDep, client: ClientDep
) -> o.GoLiveOut:
    ctx = await svc.context(p.user_id, org_id, "keys.manage")
    _, secret = await svc.set_environment(ctx, body.environment, client.request_id, p.user_id)
    return o.GoLiveOut(org=await _org_out(svc, ctx), secret_key=secret)


@router.get("/orgs/{org_id}/activity", response_model=list[o.ActivityOut])
async def activity(org_id: uuid.UUID, p: PrincipalDep, svc: OrgDep) -> list[o.ActivityOut]:
    await svc.context(p.user_id, org_id, "scores.view")
    return [
        o.ActivityOut(action=a.action, actor_email=e, at=a.occurred_at, meta=dict(a.meta)) for a, e in await svc.activity(org_id)
    ]


# ---------------------------------------------------------------- team
@router.get("/orgs/{org_id}/members", response_model=list[o.MemberOut])
async def list_members(org_id: uuid.UUID, p: PrincipalDep, svc: OrgDep) -> list[o.MemberOut]:
    await svc.context(p.user_id, org_id, "scores.view")
    return [_member_out(m, p.user_id) for m in await svc.members(org_id)]


@router.post("/orgs/{org_id}/members", response_model=o.MemberOut, status_code=201)
async def invite_member(org_id: uuid.UUID, body: o.InviteIn, p: PrincipalDep, svc: OrgDep, client: ClientDep) -> o.MemberOut:
    ctx = await svc.context(p.user_id, org_id, "members.manage")
    return _member_out(await svc.invite(ctx, body.email, body.role, client.request_id, p.user_id), p.user_id)


@router.patch("/orgs/{org_id}/members/{member_id}", response_model=o.MemberOut)
async def change_role(
    org_id: uuid.UUID, member_id: uuid.UUID, body: o.RoleIn, p: PrincipalDep, svc: OrgDep, client: ClientDep
) -> o.MemberOut:
    ctx = await svc.context(p.user_id, org_id, "members.manage")
    return _member_out(await svc.set_role(ctx, member_id, body.role, client.request_id, p.user_id), p.user_id)


@router.delete("/orgs/{org_id}/members/{member_id}", status_code=204)
async def remove_member(org_id: uuid.UUID, member_id: uuid.UUID, p: PrincipalDep, svc: OrgDep, client: ClientDep) -> Response:
    ctx = await svc.context(p.user_id, org_id, "members.manage")
    await svc.remove(ctx, member_id, client.request_id, p.user_id)
    return Response(status_code=204)


# ---------------------------------------------------------------- API keys
@router.get("/orgs/{org_id}/api-keys", response_model=list[o.ApiKeyOut])
async def list_keys(org_id: uuid.UUID, p: PrincipalDep, svc: OrgDep) -> list[o.ApiKeyOut]:
    await svc.context(p.user_id, org_id, "keys.manage")
    return [_key_out(k) for k in await svc.keys(org_id)]


@router.post("/orgs/{org_id}/api-keys/rotate", response_model=o.RotatedKeyOut, status_code=201)
async def rotate_key(org_id: uuid.UUID, body: o.RotateIn, p: PrincipalDep, svc: OrgDep, client: ClientDep) -> o.RotatedKeyOut:
    ctx = await svc.context(p.user_id, org_id, "keys.manage")
    key, value = await svc.rotate_secret(ctx, body.environment, client.request_id, p.user_id)
    return o.RotatedKeyOut(key=_key_out(key), secret_key=value)


@router.delete("/orgs/{org_id}/api-keys/{key_id}", status_code=204)
async def revoke_key(org_id: uuid.UUID, key_id: uuid.UUID, p: PrincipalDep, svc: OrgDep, client: ClientDep) -> Response:
    ctx = await svc.context(p.user_id, org_id, "keys.manage")
    await svc.revoke_key(ctx, key_id, client.request_id, p.user_id)
    return Response(status_code=204)


# ---------------------------------------------------------------- billing
def _plan_out(pl: P.Plan) -> o.PlanOut:
    return o.PlanOut(key=pl.key, name=pl.name, price_per_month_monthly=pl.price_monthly, price_per_month_yearly=pl.price_yearly,
                     scores_per_month=pl.scores_per_month, overage_per_score=pl.overage_per_score, seats=pl.seats, modules=pl.max_modules,
                     live_allowed=pl.live_allowed, self_serve=pl.self_serve)  # fmt: skip


async def _billing_out(svc: OrgService, ctx: Ctx) -> o.BillingOut:
    est = await svc.estimate(ctx.org)
    return o.BillingOut(
        plan_key=ctx.org.plan_key, billing_cycle=ctx.org.billing_cycle, pending_change=_pending(ctx.org),
        plans=[_plan_out(x) for x in sorted(P.PLANS.values(), key=lambda x: x.rank)], gst_rate=P.GST_RATE,
        estimate=None if est is None else o.EstimateOut(**est.__dict__),
        invoices=[_inv_out(i) for i in await svc.invoices(ctx.org.id)], payments_enabled=P.PAYMENTS_ENABLED,
    )  # fmt: skip


@router.get("/orgs/{org_id}/billing", response_model=o.BillingOut)
async def billing(org_id: uuid.UUID, p: PrincipalDep, svc: OrgDep) -> o.BillingOut:
    return await _billing_out(svc, await svc.context(p.user_id, org_id, "billing.manage"))


@router.put("/orgs/{org_id}/billing/plan", response_model=o.BillingOut)
async def change_plan(org_id: uuid.UUID, body: o.PlanChangeIn, p: PrincipalDep, svc: OrgDep, client: ClientDep) -> o.BillingOut:
    ctx = await svc.context(p.user_id, org_id, "billing.manage")
    await svc.change_plan(ctx, body.plan_key, body.cycle, client.request_id, p.user_id)
    return await _billing_out(svc, ctx)


@router.post("/orgs/{org_id}/billing/contact-sales", status_code=202)
async def contact_sales(
    org_id: uuid.UUID, p: PrincipalDep, svc: OrgDep, client: ClientDep, body: o.ContactSalesIn | None = None
) -> dict[str, str]:
    ctx = await svc.context(p.user_id, org_id, "billing.manage")
    wanted = body.plan_key if body and body.plan_key in P.PLANS else None
    await svc.contact_sales(ctx, client.request_id, p.user_id, wanted, body.cycle if body and body.cycle in P.CYCLES else None)
    return {"status": "requested"}


@router.post("/orgs/{org_id}/billing/invoices", response_model=o.InvoiceOut, status_code=201)
async def generate_invoice(
    org_id: uuid.UUID, body: o.InvoiceGenerateIn, p: PrincipalDep, svc: OrgDep, client: ClientDep
) -> o.InvoiceOut:
    ctx = await svc.context(p.user_id, org_id, "billing.manage")
    return _inv_out(await svc.generate_invoice(ctx, body.period, client.request_id, p.user_id))
