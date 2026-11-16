import re
import secrets
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.domains.governance.models import AuditLog
from app.domains.governance.service import audit
from app.domains.identity.models import User
from app.domains.organizations import plans as P
from app.domains.organizations.models import ApiKey, Invoice, Organization, OrgMember, UsageCounter
from app.infra.errors import AppError
from app.infra.mailer import Mail, Mailer
from app.infra.security import hash_token, new_opaque_token

INVITE_TTL_DAYS = 7
KEY_ROTATION_GRACE_HOURS = 24
_PERIOD = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")


def _now() -> datetime:
    return datetime.now(UTC)


def period_of(when: datetime) -> str:
    return when.strftime("%Y-%m")


def next_month_start(when: datetime) -> datetime:
    y, m = (when.year + 1, 1) if when.month == 12 else (when.year, when.month + 1)
    return datetime(y, m, 1, tzinfo=UTC)


def slugify(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return (s or "workspace")[:40]


def billable_env(plan: P.Plan) -> str:
    """The environment whose calls are capped and billed. Sandbox calls on a paid plan are free and uncapped."""
    return "live" if plan.live_allowed else "test"


def new_key_value(kind: str, env: str) -> str:
    return f"fs_sec_{env}_{secrets.token_urlsafe(32)}" if kind == "secret" else f"fs_pub_{env}_{secrets.token_urlsafe(12)}"


@dataclass
class Ctx:
    org: Organization
    member: OrgMember

    @property
    def plan(self) -> P.Plan:
        return P.PLANS[self.org.plan_key]


class OrgService:
    def __init__(self, session: AsyncSession, settings: Settings, mailer: Mailer | None = None) -> None:
        self.s, self.cfg, self.mailer = session, settings, mailer

    # ------------------------------------------------------------------ access
    async def context(self, user_id: uuid.UUID, org_id: uuid.UUID, permission: str | None = None) -> Ctx:
        """Membership and permission check. A non-member gets 404, never 403: another tenant's org must not be discoverable."""
        org = await self.s.get(Organization, org_id)
        q = select(OrgMember).where(OrgMember.org_id == org_id, OrgMember.user_id == user_id, OrgMember.status == "active")
        member = (await self.s.execute(q)).scalars().first() if org else None
        if org is None or member is None:
            raise AppError(404, "not_found", "Workspace not found")
        if permission and member.role not in P.PERMISSIONS[permission]:
            raise AppError(403, "forbidden", "Your role cannot do this", f"This needs the '{permission}' permission.")
        await self._apply_pending_plan(org)
        return Ctx(org, member)

    async def mine(self, user_id: uuid.UUID) -> list[tuple[Organization, OrgMember]]:
        q = (
            select(Organization, OrgMember)
            .join(OrgMember, OrgMember.org_id == Organization.id)
            .where(OrgMember.user_id == user_id, OrgMember.status == "active")
            .order_by(Organization.created_at)
        )
        return [(o, m) for o, m in (await self.s.execute(q)).all()]

    # ------------------------------------------------------------------ create
    async def create(self, user_id: uuid.UUID, name: str, request_id: str | None) -> tuple[Organization, str]:
        """Returns the org and the sandbox secret key, which is shown once and never stored."""
        user = await self.s.get(User, user_id)
        if user is None:
            raise AppError(404, "not_found", "User not found")
        now = _now()
        base = slugify(name)
        slug = base
        while (await self.s.execute(select(Organization.id).where(Organization.slug == slug))).first():
            slug = f"{base}-{secrets.token_hex(2)}"
        plan = P.PLANS[P.DEFAULT_PLAN]
        org = Organization(
            id=uuid.uuid4(), name=name.strip(), slug=slug, plan_key=plan.key, billing_cycle="monthly", environment="sandbox",
            branding={}, modules=list(P.MODULE_IDS[: plan.max_modules or len(P.MODULE_IDS)]), connectors={}, created_by=user_id,
        )  # fmt: skip
        self.s.add(org)
        await self.s.flush()
        self.s.add(
            OrgMember(
                org_id=org.id,
                user_id=user_id,
                email=user.email,
                role="owner",
                status="active",
                created_at=now,
                last_active_at=now,
            )
        )
        await self._issue_key(org.id, "publishable", "test", user_id)
        _, secret = await self._issue_key(org.id, "secret", "test", user_id)
        await self._audit(org.id, "org.created", user_id, request_id, {"plan": plan.key})
        return org, secret

    # ------------------------------------------------------------------ settings
    async def update_name(self, ctx: Ctx, name: str, request_id: str | None, actor: uuid.UUID) -> Organization:
        ctx.org.name = name.strip()
        await self._audit(ctx.org.id, "org.renamed", actor, request_id)
        return ctx.org

    async def set_branding(
        self, ctx: Ctx, theme: dict[str, object] | None, request_id: str | None, actor: uuid.UUID
    ) -> Organization:
        if theme is not None and theme.get("powered_by") is False and not ctx.plan.can_remove_powered_by:
            raise AppError(403, "plan_limit", "Removing the 'Powered by' label needs the Enterprise plan")
        ctx.org.branding = theme or {}
        await self._audit(ctx.org.id, "branding.updated" if theme else "branding.reset", actor, request_id)
        return ctx.org

    async def set_modules(self, ctx: Ctx, modules: list[str], request_id: str | None, actor: uuid.UUID) -> Organization:
        clean = list(dict.fromkeys(modules))
        if not clean or any(m not in P.MODULE_IDS for m in clean):
            raise AppError(422, "validation_error", "Choose at least one known module")
        if not P.modules_ok(ctx.plan, clean):
            raise AppError(403, "plan_limit", f"The {ctx.plan.name} plan includes {ctx.plan.max_modules} module(s)")
        ctx.org.modules = clean
        await self._audit(ctx.org.id, "modules.updated", actor, request_id, {"count": len(clean)})
        return ctx.org

    async def set_connector(
        self, ctx: Ctx, connector: str, connected: bool, request_id: str | None, actor: uuid.UUID
    ) -> Organization:
        if connector not in P.CONNECTOR_IDS:
            raise AppError(422, "validation_error", "Unknown data source")
        ctx.org.connectors = {**ctx.org.connectors, connector: connected}
        await self._audit(
            ctx.org.id,
            "connector.connected" if connected else "connector.disconnected",
            actor,
            request_id,
            {"connector": connector},
        )
        return ctx.org

    async def mark_snippet_copied(self, ctx: Ctx) -> Organization:
        if ctx.org.snippet_copied_at is None:
            ctx.org.snippet_copied_at = _now()
        return ctx.org

    # ------------------------------------------------------------------ go live
    async def checklist(self, org: Organization) -> list[dict[str, object]]:
        has_key = (await self.s.execute(
            select(ApiKey.id).where(ApiKey.org_id == org.id, ApiKey.environment == "test", ApiKey.kind == "secret", ApiKey.revoked_at.is_(None)).limit(1)
        )).first() is not None  # fmt: skip
        return [
            {"id": "workspace", "done": True},
            {"id": "sandbox_key", "done": has_key},
            {"id": "data_source", "done": any(org.connectors.values())},
            {"id": "branding", "done": bool(org.branding)},
            {"id": "snippet", "done": org.snippet_copied_at is not None},
        ]

    async def set_environment(
        self, ctx: Ctx, env: str, request_id: str | None, actor: uuid.UUID
    ) -> tuple[Organization, str | None]:
        """Returns the org and, the first time it goes live, the live secret key (shown once)."""
        org = ctx.org
        if env == org.environment:
            return org, None
        if env == "sandbox":
            org.environment = "sandbox"
            await self._audit(org.id, "env.sandbox", actor, request_id)
            return org, None
        if not ctx.plan.live_allowed:
            raise AppError(403, "plan_limit", f"The {ctx.plan.name} plan is sandbox only", "Upgrade to go live.")
        if not all(item["done"] for item in await self.checklist(org)):
            raise AppError(409, "checklist_incomplete", "Finish the setup checklist before going live")
        secret: str | None = None
        has_live = (
            await self.s.execute(
                select(ApiKey.id)
                .where(ApiKey.org_id == org.id, ApiKey.environment == "live", ApiKey.revoked_at.is_(None))
                .limit(1)
            )
        ).first()
        if has_live is None:
            await self._issue_key(org.id, "publishable", "live", actor)
            _, secret = await self._issue_key(org.id, "secret", "live", actor)
        org.environment = "live"
        org.went_live_at = org.went_live_at or _now()
        await self._audit(org.id, "env.live", actor, request_id)
        return org, secret

    # ------------------------------------------------------------------ team
    async def members(self, org_id: uuid.UUID) -> list[OrgMember]:
        q = select(OrgMember).where(OrgMember.org_id == org_id).order_by(OrgMember.created_at)
        return list((await self.s.execute(q)).scalars().all())

    async def invite(self, ctx: Ctx, email: str, role: str, request_id: str | None, actor: uuid.UUID) -> OrgMember:
        email = email.strip().lower()
        if role not in ("admin", "analyst", "viewer"):
            raise AppError(422, "validation_error", "Choose Admin, Analyst or Viewer")
        rows = await self.members(ctx.org.id)
        if any(r.email == email for r in rows):
            raise AppError(409, "already_member", "That person is already on the team")
        if not P.seats_ok(ctx.plan, len(rows) + 1):
            raise AppError(409, "seat_limit", f"All {ctx.plan.seats} seats are used", "Upgrade for more seats.")
        token = new_opaque_token()
        now = _now()
        m = OrgMember(
            org_id=ctx.org.id, email=email, role=role, status="invited", invite_token_hash=hash_token(token),
            invite_expires_at=now + timedelta(days=INVITE_TTL_DAYS), invited_by=actor, created_at=now,
        )  # fmt: skip
        self.s.add(m)
        await self.s.flush()
        if self.mailer is not None:
            link = f"{self.cfg.frontend_url}/accept-invite?token={token}"
            await self.mailer.send(Mail(to=email, subject=f"You are invited to {ctx.org.name} on FinScore",
                                        body=f"You were invited to join {ctx.org.name} as {role}.\n\nLog in with this email address, then open:\n\n{link}\n\nThis link expires in {INVITE_TTL_DAYS} days."))  # fmt: skip
        await self._audit(ctx.org.id, "member.invited", actor, request_id, {"role": role})
        return m

    async def accept_invite(self, user_id: uuid.UUID, token: str, request_id: str | None) -> tuple[Organization, OrgMember]:
        bad = AppError(404, "not_found", "This invitation is invalid or has expired")
        m = (await self.s.execute(select(OrgMember).where(OrgMember.invite_token_hash == hash_token(token)))).scalars().first()
        user = await self.s.get(User, user_id)
        if m is None or user is None or m.status != "invited" or (m.invite_expires_at and m.invite_expires_at < _now()):
            raise bad
        if m.email != user.email:  # the invite belongs to one address; do not reveal that it exists for another
            raise bad
        org = await self.s.get(Organization, m.org_id)
        if org is None:
            raise bad
        m.user_id, m.status, m.invite_token_hash, m.invite_expires_at, m.last_active_at = user_id, "active", None, None, _now()
        await self._audit(org.id, "member.joined", user_id, request_id, {"role": m.role})
        return org, m

    async def _member(self, org_id: uuid.UUID, member_id: uuid.UUID) -> OrgMember:
        m = await self.s.get(OrgMember, member_id)
        if m is None or m.org_id != org_id:
            raise AppError(404, "not_found", "Person not found")
        return m

    async def set_role(self, ctx: Ctx, member_id: uuid.UUID, role: str, request_id: str | None, actor: uuid.UUID) -> OrgMember:
        m = await self._member(ctx.org.id, member_id)
        if m.role == "owner":
            raise AppError(409, "owner_locked", "The owner's role cannot be changed")
        if role not in ("admin", "analyst", "viewer"):
            raise AppError(422, "validation_error", "Choose Admin, Analyst or Viewer")
        m.role = role
        await self._audit(ctx.org.id, "member.role_changed", actor, request_id, {"role": role})
        return m

    async def remove(self, ctx: Ctx, member_id: uuid.UUID, request_id: str | None, actor: uuid.UUID) -> None:
        m = await self._member(ctx.org.id, member_id)
        if m.role == "owner":
            raise AppError(409, "owner_locked", "The owner cannot be removed")
        await self.s.delete(m)
        await self._audit(ctx.org.id, "member.removed", actor, request_id, {"role": m.role})

    # ------------------------------------------------------------------ keys
    async def _issue_key(self, org_id: uuid.UUID, kind: str, env: str, actor: uuid.UUID | None) -> tuple[ApiKey, str]:
        value = new_key_value(kind, env)
        k = ApiKey(
            org_id=org_id, kind=kind, environment=env, prefix=value[:16], last4=value[-4:], created_at=_now(), created_by=actor,
            key_hash=hash_token(value) if kind == "secret" else None, public_value=value if kind == "publishable" else None,
        )  # fmt: skip
        self.s.add(k)
        await self.s.flush()
        return k, value

    async def keys(self, org_id: uuid.UUID) -> list[ApiKey]:
        q = select(ApiKey).where(ApiKey.org_id == org_id, ApiKey.revoked_at.is_(None)).order_by(ApiKey.created_at.desc())
        now = _now()
        return [k for k in (await self.s.execute(q)).scalars().all() if k.expires_at is None or k.expires_at > now]

    async def rotate_secret(self, ctx: Ctx, env: str, request_id: str | None, actor: uuid.UUID) -> tuple[ApiKey, str]:
        if env not in ("test", "live"):
            raise AppError(422, "validation_error", "Environment must be test or live")
        if env == "live" and ctx.org.went_live_at is None:
            raise AppError(409, "not_live", "Live keys exist after go-live")
        grace = _now() + timedelta(hours=KEY_ROTATION_GRACE_HOURS)
        for k in await self.keys(ctx.org.id):
            if k.kind == "secret" and k.environment == env and (k.expires_at is None or k.expires_at > grace):
                k.expires_at = grace  # the old key keeps working for a day so a deploy can switch over
        key, value = await self._issue_key(ctx.org.id, "secret", env, actor)
        await self._audit(ctx.org.id, "apikey.rotated", actor, request_id, {"environment": env})
        return key, value

    async def revoke_key(self, ctx: Ctx, key_id: uuid.UUID, request_id: str | None, actor: uuid.UUID) -> None:
        k = await self.s.get(ApiKey, key_id)
        if k is None or k.org_id != ctx.org.id or k.revoked_at is not None:
            raise AppError(404, "not_found", "Key not found")
        k.revoked_at = _now()
        await self._audit(ctx.org.id, "apikey.revoked", actor, request_id, {"kind": k.kind, "environment": k.environment})

    # ------------------------------------------------------------------ usage and billing
    async def usage(self, org: Organization, period: str | None = None) -> dict[str, int]:
        """Metric counts for one month, summed per environment key 'metric:env'."""
        period = period or period_of(_now())
        q = select(UsageCounter).where(UsageCounter.org_id == org.id, UsageCounter.period == period)
        return {f"{r.metric}:{r.environment}": r.count for r in (await self.s.execute(q)).scalars().all()}

    async def scores_used(self, org: Organization, period: str | None = None) -> int:
        return (await self.usage(org, period)).get(f"scores:{billable_env(P.PLANS[org.plan_key])}", 0)

    async def estimate(self, org: Organization) -> P.Estimate | None:
        return P.estimate(P.PLANS[org.plan_key], org.billing_cycle, await self.scores_used(org))

    async def change_plan(self, ctx: Ctx, plan_key: str, cycle: str, request_id: str | None, actor: uuid.UUID) -> Organization:
        org = ctx.org
        if plan_key not in P.PLANS or cycle not in P.CYCLES:
            raise AppError(422, "validation_error", "Unknown plan or billing cycle")
        target = P.PLANS[plan_key]
        if not target.self_serve:
            raise AppError(409, "contact_sales", f"{target.name} is arranged with our sales team")
        if plan_key == org.plan_key and cycle == org.billing_cycle:
            org.pending_plan_key = org.pending_cycle = org.pending_effective_at = (
                None  # choosing the current plan cancels a scheduled change
            )
            return org
        if P.is_upgrade(ctx.plan, target, org.billing_cycle, cycle):
            org.plan_key, org.billing_cycle = plan_key, cycle
            org.pending_plan_key = org.pending_cycle = org.pending_effective_at = None
            await self._audit(org.id, "plan.upgraded", actor, request_id, {"plan": plan_key, "cycle": cycle})
            return org
        await self._check_fits(org, target)
        org.pending_plan_key, org.pending_cycle, org.pending_effective_at = plan_key, cycle, next_month_start(_now())
        await self._audit(org.id, "plan.downgrade_scheduled", actor, request_id, {"plan": plan_key, "cycle": cycle})
        return org

    async def _check_fits(self, org: Organization, target: P.Plan) -> None:
        seats = len(await self.members(org.id))
        if not P.seats_ok(target, seats):
            raise AppError(
                409, "plan_conflict", f"Remove people first: {seats} on the team, {target.name} includes {target.seats}"
            )
        if not P.modules_ok(target, org.modules):
            raise AppError(409, "plan_conflict", f"Turn off modules first: {target.name} includes {target.max_modules}")
        if org.environment == "live" and not target.live_allowed:
            raise AppError(409, "plan_conflict", f"{target.name} is sandbox only. Switch back to sandbox first")

    async def _apply_pending_plan(self, org: Organization) -> None:
        """A scheduled downgrade takes effect lazily on the first request after it is due, if the workspace still fits the plan."""
        if org.pending_plan_key is None or org.pending_effective_at is None or org.pending_effective_at > _now():
            return
        target = P.PLANS[org.pending_plan_key]
        try:
            await self._check_fits(org, target)
        except AppError:
            return  # stays scheduled until the workspace fits
        org.plan_key, org.billing_cycle = target.key, org.pending_cycle or org.billing_cycle
        org.pending_plan_key = org.pending_cycle = org.pending_effective_at = None
        if org.branding.get("powered_by") is False and not target.can_remove_powered_by:
            org.branding = {**org.branding, "powered_by": True}
        await self._audit(org.id, "plan.downgraded", None, None, {"plan": target.key})

    async def invoices(self, org_id: uuid.UUID) -> list[Invoice]:
        q = select(Invoice).where(Invoice.org_id == org_id).order_by(Invoice.period.desc())
        return list((await self.s.execute(q)).scalars().all())

    async def generate_invoice(self, ctx: Ctx, period: str | None, request_id: str | None, actor: uuid.UUID) -> Invoice:
        """Prices one month from the metered usage. Idempotent per month. Uses the plan the workspace is on when this is called."""
        now = _now()
        period = period or period_of(now)
        if not _PERIOD.match(period) or period > period_of(now):
            raise AppError(422, "validation_error", "Period must be YYYY-MM and not in the future")
        existing = (
            (await self.s.execute(select(Invoice).where(Invoice.org_id == ctx.org.id, Invoice.period == period)))
            .scalars()
            .first()
        )
        if existing:
            return existing
        est = P.estimate(ctx.plan, ctx.org.billing_cycle, await self.scores_used(ctx.org, period))
        if est is None:
            raise AppError(409, "contact_sales", "Enterprise invoices are issued by our sales team")
        inv = Invoice(
            org_id=ctx.org.id, number=f"INV-{period.replace('-', '')}-{ctx.org.id.hex[:6].upper()}", period=period, plan_key=ctx.org.plan_key,
            billing_cycle=ctx.org.billing_cycle, base_amount=est.base, overage_scores=est.overage_scores, overage_amount=est.overage_amount,
            subtotal=est.subtotal, gst=est.gst, total=est.total, status="paid" if est.total == 0 else "open", issued_at=now,
            paid_at=now if est.total == 0 else None,
        )  # fmt: skip
        self.s.add(inv)
        await self.s.flush()
        await self._audit(ctx.org.id, "invoice.issued", actor, request_id, {"period": period})
        return inv

    async def contact_sales(self, ctx: Ctx, request_id: str | None, actor: uuid.UUID) -> None:
        await self._audit(ctx.org.id, "sales.requested", actor, request_id, {"plan": ctx.org.plan_key})

    # ------------------------------------------------------------------ activity and audit
    async def activity(self, org_id: uuid.UUID, limit: int = 20) -> list[tuple[AuditLog, str | None]]:
        q = (
            select(AuditLog, OrgMember.email)
            .outerjoin(OrgMember, (OrgMember.user_id == AuditLog.actor_user_id) & (OrgMember.org_id == org_id))
            .where(AuditLog.entity_type == "organization", AuditLog.entity_id == str(org_id))
            .order_by(AuditLog.seq.desc())
            .limit(limit)
        )
        return [(a, e) for a, e in (await self.s.execute(q)).all()]

    async def _audit(
        self,
        org_id: uuid.UUID,
        action: str,
        actor: uuid.UUID | None,
        request_id: str | None,
        meta: dict[str, object] | None = None,
    ) -> None:
        # meta carries roles, plan names and counts only. Never emails, keys or amounts of a person's data.
        await audit(
            self.s,
            action=action,
            entity_type="organization",
            entity_id=str(org_id),
            actor_user_id=actor,
            request_id=request_id,
            meta=meta or {},
        )

    # ------------------------------------------------------------------ metering
    async def meter(self, org: Organization, key_env: str, metric: str = "scores") -> int:
        """Atomically add one to the month's counter and return the new total. Raises 429 when a hard-capped plan is full."""
        plan = P.PLANS[org.plan_key]
        cap = plan.scores_per_month if (plan.hard_cap and key_env == billable_env(plan)) else None
        # Fixed text only: the cap clause is a constant and every value below is a bound parameter.
        sql = (
            "INSERT INTO usage_counters (org_id, period, environment, metric, count) VALUES (:o, :p, :e, :m, 1) "  # noqa: S608
            "ON CONFLICT (org_id, period, environment, metric) DO UPDATE SET count = usage_counters.count + 1 "
            + ("WHERE usage_counters.count < :cap " if cap is not None else "")
            + "RETURNING count"
        )
        params: dict[str, object] = {"o": org.id, "p": period_of(_now()), "e": key_env, "m": metric}
        if cap is not None:
            params["cap"] = cap
        row = (await self.s.execute(text(sql), params)).first()
        if row is None:
            raise AppError(
                429,
                "quota_exceeded",
                "Monthly score quota reached",
                f"The {plan.name} plan includes {cap} scores a month. Upgrade to continue.",
            )
        return int(row[0])

    async def seats_in_use(self, org_id: uuid.UUID) -> int:
        return int(
            (await self.s.execute(select(func.count()).select_from(OrgMember).where(OrgMember.org_id == org_id))).scalar_one()
        )
