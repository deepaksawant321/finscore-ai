import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.domains.actions.models import ACTIVE_STATES, ActionEvent, UserAction
from app.domains.goals.service import GoalService
from app.domains.governance.service import audit
from app.domains.profile.service import ProfileService, derive_inputs
from app.domains.scoring.models import ScoreRun
from app.domains.scoring.service import ScoringService
from app.engines import actions as eng
from app.engines.money import D, format_inr, round_money
from app.engines.score import compute_score
from app.infra.errors import AppError
from app.rulebook.loader import DEFAULT_VERSION, RulebookNotApproved, assert_official_allowed, load_rulebook

# Which stated facts a derived input comes from (for the confidence factor).
DERIVED_FROM = {
    "savings_rate": ("annual_income", "monthly_expenses"),
    "emergency_months": ("liquid_assets", "monthly_expenses"),
    "debt_to_income": ("monthly_emi_total", "annual_income"),
}
TRANSITIONS: dict[str, dict[str, str]] = {
    "suggested": {"accept": "accepted", "skip": "skipped", "snooze": "snoozed"},
    "snoozed": {"accept": "accepted", "skip": "skipped", "wake": "suggested"},
    "accepted": {"start": "in_progress", "complete": "completed", "skip": "skipped"},
    "in_progress": {"complete": "completed", "skip": "skipped"},
    "completed": {"reopen": "in_progress"},
    "skipped": {"reopen": "suggested"},
}
MAX_SNOOZE_DAYS = 90  # PLACEHOLDER (no approved snooze policy)


@dataclass
class ActionView:
    row: UserAction
    title: str
    why: str
    cta: str
    pillar: str
    effort: str
    time_to_impact_weeks: int
    allowed: list[str]


def _now() -> datetime:
    return datetime.now(UTC)


def _fmt_cta(spec: eng.ActionSpec, change: dict[str, object]) -> str:
    target = change.get(spec.change.field)
    return spec.cta.replace("{target}", format_inr(str(target)) if isinstance(target, str | Decimal) else "")


class ActionService:
    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self.s, self.cfg = session, settings
        self.profile = ProfileService(session)

    # ---------- reading ----------
    async def _get(self, user_id: uuid.UUID, action_id: uuid.UUID) -> UserAction:
        a = await self.s.get(UserAction, action_id)
        if a is None or a.user_id != user_id:  # never reveal other users' actions
            raise AppError(404, "not_found", "Action not found")
        return a

    def view(self, a: UserAction) -> ActionView:
        specs = {s.key: s for s in load_rulebook(a.rulebook_version).action_specs()}
        sp = specs.get(a.catalog_key)
        cta = _fmt_cta(sp, a.params) if sp else a.catalog_key
        return ActionView(
            a, sp.title if sp else a.catalog_key, sp.why if sp else "", cta, sp.pillar if sp else "", sp.effort if sp else "",
            sp.time_to_impact_weeks if sp else 0, sorted(TRANSITIONS.get(a.state, {})),
        )  # fmt: skip

    async def get_view(self, user_id: uuid.UUID, action_id: uuid.UUID) -> ActionView:
        return self.view(await self._get(user_id, action_id))

    async def mine(self, user_id: uuid.UUID, include_closed: bool = False) -> list[ActionView]:
        q = select(UserAction).where(UserAction.user_id == user_id)
        if not include_closed:
            q = q.where(UserAction.state.in_(ACTIVE_STATES))
        rows = (await self.s.execute(q)).scalars().all()
        rows = sorted(rows, key=lambda r: (-D(r.priority_breakdown.get("total", "0")), r.catalog_key))
        return [self.view(r) for r in rows]

    # ---------- state changes ----------
    async def _event(self, a: UserAction, frm: str | None, to: str, meta: dict[str, str] | None = None) -> None:
        self.s.add(
            ActionEvent(
                id=uuid.uuid4(), action_id=a.id, user_id=a.user_id, from_state=frm, to_state=to, at=_now(), meta=meta or {}
            )
        )
        a.state, a.updated_at = to, _now()
        await self.s.flush()

    async def transition(
        self, user_id: uuid.UUID, action_id: uuid.UUID, verb: str, snooze_days: int | None = None, request_id: str | None = None
    ) -> ActionView:
        a = await self._get(user_id, action_id)
        nxt = TRANSITIONS.get(a.state, {}).get(verb)
        if nxt is None:
            raise AppError(409, "invalid_transition", f"You can't {verb} an action that is {a.state.replace('_', ' ')}")
        meta: dict[str, str] = {}
        if verb == "snooze":
            if snooze_days is None or not (1 <= snooze_days <= MAX_SNOOZE_DAYS):
                raise AppError(422, "validation_error", f"Snooze for between 1 and {MAX_SNOOZE_DAYS} days")
            a.snoozed_until = _now() + timedelta(days=snooze_days)
            meta["days"] = str(snooze_days)
        elif nxt != "snoozed":
            a.snoozed_until = None
        await self._event(a, a.state, nxt, meta)
        await audit(self.s, action=f"action.{verb}", entity_type="user_action", entity_id=str(a.id), actor_user_id=user_id,
                    request_id=request_id, meta={"key": a.catalog_key})  # fmt: skip
        if nxt == "completed":  # "I did it" only becomes verified when the user's numbers actually show it
            await self._try_verify(a, request_id)
        return self.view(a)

    async def _try_verify(self, a: UserAction, request_id: str | None) -> bool:
        specs = {s.key: s for s in load_rulebook(a.rulebook_version).action_specs()}
        sp = specs.get(a.catalog_key)
        if sp is None:
            return False
        inputs = derive_inputs(await self.profile.raw_inputs(a.user_id))
        if not eng.is_done(sp, inputs):
            return False
        fact = await self.profile.current_fact(a.user_id, sp.verify_field)
        a.verified_by_fact_id = fact.id if fact else None
        meta: dict[str, str] = {}
        try:  # closed loop: a verified action updates the score (idempotent: same inputs give the same run)
            run = await ScoringService(self.s, self.cfg).compute(a.user_id, request_id)
            meta["score_after"] = format(run.overall, "f")
        except AppError:
            pass  # e.g. production guard or not enough data: verification still stands
        await self._event(a, a.state, "verified", meta)
        await audit(self.s, action="action.verified", entity_type="user_action", entity_id=str(a.id), actor_user_id=a.user_id,
                    request_id=request_id, meta={"key": a.catalog_key})  # fmt: skip
        return True

    # ---------- suggestion ----------
    async def refresh(self, user_id: uuid.UUID, request_id: str | None = None) -> list[ActionView]:
        """Recompute today's best actions and reconcile stored ones. Idempotent."""
        rb = load_rulebook(DEFAULT_VERSION)
        try:
            assert_official_allowed(rb, self.cfg.env)
        except RulebookNotApproved as e:
            raise AppError(503, "rulebook_not_approved", "Action suggestions are not available yet",
                           "The official action rules have not been approved by the Product Team.") from e  # fmt: skip
        raw = await self.profile.raw_inputs(user_id)
        inputs = derive_inputs(raw)
        spec = rb.score_spec()
        base = compute_score(spec, inputs).overall
        if base is None:
            return await self.mine(user_id)
        facts = {f.field_key: f for f in await self.profile.current_facts(user_id)}
        has_goal = bool(await GoalService(self.s).list(user_id))
        cands: list[eng.Candidate] = []
        for sp in rb.action_specs():
            if not eng.applicable(sp, inputs):
                continue
            change = eng.proposed_change(sp, inputs)
            if change is None:
                continue
            after = compute_score(spec, derive_inputs({**raw, **change})).overall
            if after is None:
                continue
            keys = DERIVED_FROM.get(sp.applies.input, (sp.applies.input,))
            conf = min((facts[k].confidence for k in keys if k in facts), default=Decimal(1))
            cands.append(
                eng.Candidate(
                    sp, change, round_money(after - base), eng.rupee_effect_per_year(sp, inputs, change), conf, has_goal
                )
            )
        cfg = rb.priority_config()
        everything = {c.spec.key: (c, bd) for c, bd in eng.prioritise(cands, _unlimited(cfg))}
        top = {c.spec.key for c, _ in eng.prioritise(cands, cfg)}

        now = _now()
        rows = (await self.s.execute(select(UserAction).where(UserAction.user_id == user_id))).scalars().all()
        active = {r.catalog_key: r for r in rows if r.state in ACTIVE_STATES}
        skipped = {r.catalog_key for r in rows if r.state == "skipped"}
        specs = {s.key: s for s in rb.action_specs()}
        for key, a in list(active.items()):
            known = specs.get(key)
            if known is None:
                await self._event(a, a.state, "expired", {"reason": "removed_from_library"})
                continue
            if a.state in ("accepted", "in_progress", "completed"):
                await self._try_verify(a, request_id)
                continue
            if a.state == "snoozed" and a.snoozed_until is not None and a.snoozed_until <= now:
                await self._event(a, "snoozed", "suggested", {"reason": "snooze_ended"})
                a.snoozed_until = None
            if eng.is_done(known, inputs):
                await self._event(a, a.state, "expired", {"reason": "already_done"})
            elif key in everything:
                c, bd = everything[key]
                a.params, a.expected_delta, a.priority_breakdown = _params(c), c.score_delta, _bd(bd)
                a.official, a.updated_at = rb.is_official, now
            else:
                await self._event(a, a.state, "expired", {"reason": "no_longer_relevant"})
        await self.s.flush()
        for key in top:
            existing = active.get(key)
            if (existing is not None and existing.state != "expired") or key in skipped:
                continue
            c, bd = everything[key]
            a = UserAction(
                id=uuid.uuid4(), user_id=user_id, catalog_key=key, state="suggested", params=_params(c), priority_breakdown=_bd(bd),
                expected_delta=c.score_delta, rulebook_version=rb.version, official=rb.is_official, created_at=now, updated_at=now,
            )  # fmt: skip
            self.s.add(a)
            await self.s.flush()
            self.s.add(
                ActionEvent(
                    id=uuid.uuid4(), action_id=a.id, user_id=user_id, from_state=None, to_state="suggested", at=now, meta={}
                )
            )
        await self.s.flush()
        return await self.mine(user_id)

    # ---------- timeline ----------
    async def timeline(self, user_id: uuid.UUID, limit: int = 30) -> list[dict[str, str]]:
        specs = {s.key: s for s in load_rulebook(DEFAULT_VERSION).action_specs()}
        acts = {a.id: a for a in (await self.s.execute(select(UserAction).where(UserAction.user_id == user_id))).scalars().all()}
        evs = (
            await self.s.execute(
                select(ActionEvent).where(ActionEvent.user_id == user_id).order_by(ActionEvent.at.desc()).limit(limit)
            )
        ).scalars()
        out: list[dict[str, str]] = []
        for e in evs:
            a = acts.get(e.action_id)
            title = specs[a.catalog_key].title if a and a.catalog_key in specs else "Action"
            detail = f"{title}: {e.to_state.replace('_', ' ')}"
            if "score_after" in e.meta:
                detail += f" (score now {round(float(e.meta['score_after']))})"
            out.append({"at": e.at.isoformat(), "kind": "action", "title": detail})
        runs = (
            await self.s.execute(
                select(ScoreRun).where(ScoreRun.user_id == user_id).order_by(ScoreRun.computed_at.desc()).limit(limit)
            )
        ).scalars()
        out += [
            {"at": r.computed_at.isoformat(), "kind": "score", "title": f"Score computed: {round(float(r.overall))}"}
            for r in runs
        ]
        return sorted(out, key=lambda x: x["at"], reverse=True)[:limit]


def _unlimited(cfg: eng.PriorityConfig) -> eng.PriorityConfig:
    return eng.PriorityConfig(cfg.weights, cfg.urgency_points, cfg.ease_points, 1000)


def _params(c: eng.Candidate) -> dict[str, object]:
    return {k: (v if isinstance(v, bool) else format(v, "f")) for k, v in c.change.items()}


def _bd(bd: eng.Breakdown) -> dict[str, str]:
    q = Decimal("0.1")
    return {
        "impact": str(bd.impact.quantize(q)), "financial_impact": str(bd.financial_impact.quantize(q)),
        "urgency": str(bd.urgency.quantize(q)), "ease": str(bd.ease.quantize(q)), "confidence": str(bd.confidence.quantize(q)),
        "goal_alignment": str(bd.goal_alignment.quantize(q)), "total": str(bd.total.quantize(q)),
    }  # fmt: skip
