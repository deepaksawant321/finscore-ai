import uuid
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.domains.goals.models import Goal
from app.domains.goals.service import FundingView, GoalService, funding_view
from app.domains.governance.service import audit
from app.domains.profile.catalog import FIELDS, InvalidFact, normalise_value
from app.domains.profile.service import ProfileService, derive_inputs
from app.domains.scoring.service import ENGINE_VERSION
from app.domains.simulation.models import Simulation
from app.domains.simulation.specs import GoalWhatIf, Invest, ScoreWhatIf
from app.engines import simulate
from app.engines.money import D, round_money
from app.engines.score import compute_score
from app.engines.stage import resolve_stage
from app.infra.errors import AppError
from app.rulebook.loader import DEFAULT_VERSION, RulebookNotApproved, assert_official_allowed, load_rulebook

MAX_LIST = 50
# PLACEHOLDER: a pillar must move by at least this many points to be listed in a what-if (display filter, not a rule).
MATERIAL_POINTS = Decimal("0.05")


def _s(d: Decimal) -> str:
    return format(round_money(d), "f")


def _side(v: FundingView) -> dict[str, str]:
    return {
        "projected_total": _s(v.projected_total), "future_target": _s(v.future_target), "shortfall": _s(v.shortfall),
        "required_monthly_additional": _s(v.required_monthly_additional), "funded_ratio": _s(v.funded_ratio),
    }  # fmt: skip


class SimulationService:
    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self.s, self.cfg = session, settings

    async def get(self, user_id: uuid.UUID, sim_id: uuid.UUID) -> Simulation:
        sim = await self.s.get(Simulation, sim_id)
        if sim is None or sim.user_id != user_id:  # never reveal other users' simulations
            raise AppError(404, "not_found", "Simulation not found")
        return sim

    async def list(self, user_id: uuid.UUID, limit: int = 20) -> list[Simulation]:
        q = (
            select(Simulation)
            .where(Simulation.user_id == user_id)
            .order_by(Simulation.created_at.desc())
            .limit(min(limit, MAX_LIST))
        )
        return list((await self.s.execute(q)).scalars().all())

    async def run(self, user_id: uuid.UUID, spec: ScoreWhatIf | Invest | GoalWhatIf, request_id: str | None = None) -> Simulation:
        match spec:
            case ScoreWhatIf():
                result, official = await self._score_what_if(user_id, spec)
            case Invest():
                result, official = self._invest(spec), True
            case GoalWhatIf():
                result, official = await self._goal_what_if(user_id, spec), True
        sim = Simulation(
            id=uuid.uuid4(), user_id=user_id, kind=spec.kind, scenario=spec.model_dump(mode="json"), result=result,
            rulebook_version=DEFAULT_VERSION, engine_version=ENGINE_VERSION, official=official, created_at=datetime.now(UTC),
        )  # fmt: skip
        self.s.add(sim)
        await self.s.flush()
        await audit(self.s, action="simulation.run", entity_type="simulation", entity_id=str(sim.id), actor_user_id=user_id,
                    request_id=request_id, meta={"kind": spec.kind})  # fmt: skip
        return sim

    # ---- scenarios ----
    @staticmethod
    def _invest(spec: Invest) -> dict[str, object]:
        try:
            r = simulate.invest(spec.monthly_amount, spec.lumpsum, spec.return_pct, spec.years, spec.inflation_pct)
        except ValueError as e:
            raise AppError(422, "validation_error", str(e)) from e
        return {
            "final_value": _s(r.final_value), "total_contributed": _s(r.total_contributed), "gain": _s(r.gain),
            "real_value": None if r.real_value is None else _s(r.real_value),
            "schedule": [{"year": p.year, "balance": _s(p.balance), "contributed": _s(p.contributed)} for p in r.schedule],
            "assumptions": list(r.assumptions),
        }  # fmt: skip

    async def _goal_what_if(self, user_id: uuid.UUID, spec: GoalWhatIf) -> dict[str, object]:
        g = await GoalService(self.s).get(user_id, spec.goal_id)
        try:
            simulate.check_rate("return", spec.return_pct)
            simulate.check_rate("inflation", spec.inflation_pct)
        except ValueError as e:
            raise AppError(422, "validation_error", str(e)) from e
        before = funding_view(g, spec.return_pct, spec.inflation_pct)
        # Transient copy (never added to the session): the stored goal is not touched by a simulation.
        alt = Goal(target_amount_today=g.target_amount_today, target_date=g.target_date, current_funding=g.current_funding,
                   monthly_funding=spec.new_monthly_funding)  # fmt: skip
        after = funding_view(alt, spec.return_pct, spec.inflation_pct)
        return {
            "goal": g.name, "months_remaining": before.months_remaining, "current_monthly": _s(g.monthly_funding),
            "new_monthly": _s(spec.new_monthly_funding), "before": _side(before), "after": _side(after),
            "projected_change": _s(after.projected_total - before.projected_total), "assumptions": list(after.assumptions),
        }  # fmt: skip

    async def _score_what_if(self, user_id: uuid.UUID, spec: ScoreWhatIf) -> tuple[dict[str, object], bool]:
        rb = load_rulebook(DEFAULT_VERSION)
        try:
            assert_official_allowed(rb, self.cfg.env)
        except RulebookNotApproved as e:
            raise AppError(503, "rulebook_not_approved", "FinScore is not available yet",
                           "The official scoring rules have not been approved by the Product Team.") from e  # fmt: skip
        base_raw = await ProfileService(self.s).raw_inputs(user_id)
        new_raw = dict(base_raw)
        for key, raw in spec.overrides.items():
            if key not in FIELDS:
                raise AppError(422, "validation_error", f"Unknown field: {key}")
            try:
                v = normalise_value(FIELDS[key], raw)
            except InvalidFact as e:
                raise AppError(422, "validation_error", str(e)) from e
            kind = FIELDS[key].kind
            new_raw[key] = v == "true" if kind == "bool" else (D(v) if kind in ("money", "int") else None)
        score_spec = rb.score_spec()
        base = compute_score(score_spec, derive_inputs(base_raw))
        if base.overall is None:
            raise AppError(422, "insufficient_data", "Not enough information for a baseline score yet",
                           "Tell me about your income and expenses first.")  # fmt: skip
        new = compute_score(score_spec, derive_inputs(new_raw))
        if new.overall is None:  # cannot happen when overrides only add or replace facts; fail loudly if it ever does
            raise AppError(422, "insufficient_data", "That change leaves too little information to score")
        base_by = {p.id: p for p in base.pillars}
        changes: list[dict[str, object]] = []
        for p in new.pillars:
            b = base_by[p.id]
            if p.score is None:
                continue
            before_c = b.contribution if b.score is not None else None
            if before_c is None or abs(p.contribution - before_c) >= MATERIAL_POINTS:  # newly scored areas are always listed
                changes.append({
                    "id": p.id, "name": p.name, "score_before": None if b.score is None else _s(b.score), "score_after": _s(p.score),
                    "points_change": None if before_c is None else _s(p.contribution - before_c),
                })  # fmt: skip
        age = new_raw.get("age")
        age_i = int(age) if isinstance(age, Decimal) else None
        stages, matrix = rb.stages(), rb.stage_matrix()
        result: dict[str, object] = {
            "overrides": dict(spec.overrides),
            "baseline": {"overall": _s(base.overall), "confidence": _s(base.confidence),
                         "stage": resolve_stage(base.overall, age_i, stages, matrix).stage},
            "scenario": {"overall": _s(new.overall), "confidence": _s(new.confidence),
                         "stage": resolve_stage(new.overall, age_i, stages, matrix).stage},
            "delta": _s(new.overall - base.overall), "pillar_changes": changes,
            "assumptions": [
                "Uses the approved scoring rules" if rb.is_official else "Uses the current scoring rules, which are demo rules and not official",
                "Nothing is saved: your stored facts and score history are unchanged",
            ],
        }  # fmt: skip
        return result, rb.is_official
