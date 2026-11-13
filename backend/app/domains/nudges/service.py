import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.domains.actions.service import DERIVED_FROM, ActionService
from app.domains.goals.service import GoalService
from app.domains.governance.service import audit
from app.domains.health.service import HealthService
from app.domains.interview.service import InterviewService
from app.domains.nudges import rules
from app.domains.nudges.models import ACTIVE_STATES, NotificationPref, Nudge
from app.domains.profile.catalog import FIELDS
from app.domains.profile.service import ProfileService
from app.domains.scoring.service import ScoringService
from app.engines.money import D
from app.infra.errors import AppError
from app.rulebook.loader import DEFAULT_VERSION, load_rulebook

MAX_ACTIVE_LIMIT = 10  # upper bound on the frequency control (placeholder)
MAX_SNOOZE_DAYS = 90
VERBS = {"seen": "seen", "dismiss": "dismissed", "done": "done", "snooze": "snoozed"}


def _now() -> datetime:
    return datetime.now(UTC)


class NudgeService:
    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self.s, self.cfg = session, settings

    # ---------- preferences ----------
    async def prefs(self, user_id: uuid.UUID) -> NotificationPref:
        p = await self.s.get(NotificationPref, user_id)
        if p is None:
            default = load_rulebook(DEFAULT_VERSION).nudge_thresholds()["max_active_default"]
            p = NotificationPref(user_id=user_id, in_app_enabled=True, max_active=default, muted_rules=[], updated_at=_now())
            self.s.add(p)
            await self.s.flush()
        return p

    async def set_prefs(
        self, user_id: uuid.UUID, enabled: bool, max_active: int, muted: list[str], request_id: str | None = None
    ) -> NotificationPref:
        if not (1 <= max_active <= MAX_ACTIVE_LIMIT):
            raise AppError(422, "validation_error", f"Show between 1 and {MAX_ACTIVE_LIMIT} nudges at a time")
        unknown = sorted(set(muted) - set(rules.RULES))
        if unknown:
            raise AppError(422, "validation_error", f"Unknown nudge type: {unknown[0]}")
        p = await self.prefs(user_id)
        p.in_app_enabled, p.max_active, p.muted_rules, p.updated_at = enabled, max_active, sorted(set(muted)), _now()
        await audit(self.s, action="nudge.prefs_changed", entity_type="notification_prefs", entity_id=str(user_id), actor_user_id=user_id,
                    request_id=request_id, meta={"enabled": str(enabled), "muted": ",".join(p.muted_rules)})  # fmt: skip
        return p

    # ---------- reading ----------
    async def visible(self, user_id: uuid.UUID) -> list[Nudge]:
        p = await self.prefs(user_id)
        if not p.in_app_enabled:
            return []
        q = select(Nudge).where(Nudge.user_id == user_id, Nudge.state.in_(("pending", "seen")))
        rows = [n for n in (await self.s.execute(q)).scalars().all() if n.rule_key not in p.muted_rules]
        rows.sort(key=lambda n: (rules.PRIORITIES.index(n.priority), -n.created_at.timestamp(), n.dedupe_key))
        return rows[: p.max_active]

    async def _get(self, user_id: uuid.UUID, nudge_id: uuid.UUID) -> Nudge:
        n = await self.s.get(Nudge, nudge_id)
        if n is None or n.user_id != user_id:  # never reveal other users' nudges
            raise AppError(404, "not_found", "Nudge not found")
        return n

    # ---------- reacting ----------
    async def react(
        self, user_id: uuid.UUID, nudge_id: uuid.UUID, verb: str, days: int | None = None, request_id: str | None = None
    ) -> Nudge:
        n = await self._get(user_id, nudge_id)
        if verb not in VERBS:
            raise AppError(422, "validation_error", "Unknown reaction")
        if n.state not in ACTIVE_STATES:
            raise AppError(409, "invalid_transition", f"This nudge is already {n.state}")
        if verb == "snooze":
            if days is None or not (1 <= days <= MAX_SNOOZE_DAYS):
                raise AppError(422, "validation_error", f"Snooze for between 1 and {MAX_SNOOZE_DAYS} days")
            n.snoozed_until = _now() + timedelta(days=days)
        n.state, n.updated_at = VERBS[verb], _now()
        await audit(
            self.s,
            action=f"nudge.{VERBS[verb]}",
            entity_type="nudge",
            entity_id=str(n.id),
            actor_user_id=user_id,
            request_id=request_id,
            meta={"rule": n.rule_key},
        )  # fmt: skip  (rule key only: this is the opt-out metric)
        return n

    # ---------- generating ----------
    async def _snapshot(self, user_id: uuid.UUID) -> rules.Snapshot:
        now = _now()
        rb = load_rulebook(DEFAULT_VERSION)
        profile = ProfileService(self.s)
        facts = await profile.current_facts(user_id)
        fact_keys = {f.field_key for f in facts}
        specs = {s.key: s for s in rb.action_specs()}
        actions = []
        for v in await ActionService(self.s, self.cfg).mine(user_id):
            sp = specs.get(v.row.catalog_key)
            if sp is None:
                continue
            actions.append(rules.ActionInfo(
                str(v.row.id), v.row.catalog_key, v.title, v.row.state, sp.urgency, D(v.row.priority_breakdown.get("total", "0")),
                v.row.expected_delta, sp.why, FIELDS[sp.verify_field].label, (now - v.row.updated_at).days,
            ))  # fmt: skip
        today = now.date()
        goals = [
            rules.GoalInfo(str(g.id), g.name, (g.target_date - today).days)
            for g in await GoalService(self.s).list(user_id)
            if g.status == "active"
        ]
        runs = await ScoringService(self.s, self.cfg).history(user_id, 2)
        score = None
        if runs:
            latest = runs[0]
            early = latest.confidence < rb.min_confidence_for_stage()
            missing: list[str] = []
            for c in await InterviewService(self.s, None).coverage(user_id):
                for k in c["missing"]:  # type: ignore[attr-defined]
                    for raw in DERIVED_FROM.get(k, (k,)):
                        if raw not in fact_keys and raw in FIELDS and FIELDS[raw].label not in missing:
                            missing.append(FIELDS[raw].label)
            score = rules.ScoreInfo(
                str(latest.id), latest.overall, runs[1].overall if len(runs) > 1 else None, early, latest.official, tuple(missing)
            )
        alerts: list[rules.HealthAlertInfo] = []
        try:  # a health check is recorded when the companion looks; unavailable in production until thresholds are approved
            rep = await HealthService(self.s, self.cfg).check(user_id)
            alerts = [
                rules.HealthAlertInfo(str(rep.snapshot_id), e.vital, e.label, e.from_status, e.to_status)
                for e in rep.events
                if e.kind == "health_worse"
            ]
        except AppError:
            pass
        return rules.Snapshot(
            tuple(rules.FactInfo(str(f.id), f.field_key, FIELDS[f.field_key].label, (now - f.valid_from).days) for f in facts if f.field_key in FIELDS),
            tuple(actions), tuple(goals), score, tuple(alerts),
        )  # fmt: skip

    async def refresh(self, user_id: uuid.UUID, request_id: str | None = None) -> list[Nudge]:
        """Evaluate the rules against the user's current state and reconcile stored nudges. Idempotent."""
        p = await self.prefs(user_id)
        if not p.in_app_enabled:
            return []
        now = _now()
        t = load_rulebook(DEFAULT_VERSION).nudge_thresholds()
        cands = {c.dedupe_key: c for c in rules.evaluate(await self._snapshot(user_id), t) if c.rule not in p.muted_rules}
        existing = {
            n.dedupe_key: n for n in (await self.s.execute(select(Nudge).where(Nudge.user_id == user_id))).scalars().all()
        }
        for key, n in existing.items():
            if n.state == "snoozed" and n.snoozed_until is not None and n.snoozed_until <= now:
                n.state, n.snoozed_until, n.updated_at = "pending", None, now
            if n.state in ("pending", "seen") and key not in cands:  # the situation resolved itself
                n.state, n.updated_at = "expired", now
        for key, c in cands.items():
            if key in existing:  # dismissed / done / expired / snoozed nudges are never re-created: no repeat after refusal
                continue
            self.s.add(Nudge(id=uuid.uuid4(), user_id=user_id, rule_key=c.rule, dedupe_key=key, priority=c.priority, title=c.title,
                             body=c.body, cta_label=c.cta_label, cta_path=c.cta_path, state="pending", created_at=now, updated_at=now))  # fmt: skip
        await self.s.flush()
        return await self.visible(user_id)
