import hashlib
import json
import uuid
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.domains.events import bus
from app.domains.governance.service import audit
from app.domains.profile.models import InputSnapshot
from app.domains.profile.service import ProfileService
from app.domains.scoring.models import ScoreRun
from app.engines.money import D
from app.engines.score import compute_score
from app.engines.stage import resolve_stage
from app.engines.traits import evaluate_trait, pick_persona
from app.infra.errors import AppError
from app.rulebook.loader import DEFAULT_VERSION, RulebookNotApproved, assert_official_allowed, load_rulebook

ENGINE_VERSION = "0.1.0"
# PLACEHOLDER (D-B3/D-B4): score change (points) below which the trend is 'stable'. Not an approved rule.
STABLE_BAND = Decimal(1)


def _s(x: Decimal | None, places: str = "0.01") -> str | None:
    return None if x is None else format(x.quantize(Decimal(places)), "f")


def _digest(payload: dict[str, str | None]) -> str:
    return hashlib.sha256(json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


class ScoringService:
    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self.s, self.cfg = session, settings
        self.profile = ProfileService(session)

    async def latest(self, user_id: uuid.UUID) -> ScoreRun | None:
        q = select(ScoreRun).where(ScoreRun.user_id == user_id).order_by(ScoreRun.computed_at.desc()).limit(1)
        return (await self.s.execute(q)).scalars().first()

    async def history(self, user_id: uuid.UUID, limit: int = 50) -> list[ScoreRun]:
        q = select(ScoreRun).where(ScoreRun.user_id == user_id).order_by(ScoreRun.computed_at.desc()).limit(limit)
        return list((await self.s.execute(q)).scalars().all())

    async def get_run(self, user_id: uuid.UUID, run_id: uuid.UUID) -> ScoreRun:
        run = await self.s.get(ScoreRun, run_id)
        if run is None or run.user_id != user_id:  # never reveal other users' runs
            raise AppError(404, "not_found", "Score run not found")
        return run

    async def compute(self, user_id: uuid.UUID, request_id: str | None = None) -> ScoreRun:
        rb = load_rulebook(DEFAULT_VERSION)
        try:
            assert_official_allowed(rb, self.cfg.env)
        except RulebookNotApproved as e:
            raise AppError(
                503, "rulebook_not_approved", "FinScore is not available yet",
                "The official scoring rules have not been approved by the Product Team.",
            ) from e  # fmt: skip
        inputs = await self.profile.inputs(user_id)
        spec = rb.score_spec()
        result = compute_score(spec, inputs)
        if result.overall is None:
            raise AppError(422, "insufficient_data", "Not enough information to compute a score yet",
                           "Tell me a bit more about your income, expenses or savings.")  # fmt: skip
        used = sorted({k for p in spec.pillars if p.measure for k in p.measure.inputs})
        payload = {k: (None if inputs.get(k) is None else str(inputs[k])) for k in used}
        payload["age"] = None if inputs.get("age") is None else str(inputs["age"])
        digest = _digest(payload)

        prev = await self.latest(user_id)
        if prev and prev.rulebook_version == rb.version and prev.engine_version == ENGINE_VERSION:
            prev_snap = await self.s.get(InputSnapshot, prev.snapshot_id)
            if prev_snap and prev_snap.digest == digest:
                return prev  # idempotent: same inputs + same rules + same engine => same run

        now = datetime.now(UTC)
        snap = InputSnapshot(id=uuid.uuid4(), user_id=user_id, digest=digest, payload=dict(payload), created_at=now)
        self.s.add(snap)
        await self.s.flush()

        age_v = inputs.get("age")
        stage = resolve_stage(result.overall, int(age_v) if isinstance(age_v, Decimal) else None, rb.stages(), rb.stage_matrix())
        conf = rb.trait_confidence()
        traits = [t for spec_t in rb.trait_specs() if (t := evaluate_trait(spec_t, inputs, conf)) is not None]
        persona = pick_persona(rb.personas(), {t.key: t.value for t in traits})
        if prev is None:
            trend = "new"
        else:
            delta = result.overall - prev.overall
            trend = "stable" if abs(delta) <= STABLE_BAND else ("improving" if delta > 0 else "declining")

        run = ScoreRun(
            id=uuid.uuid4(),
            user_id=user_id,
            snapshot_id=snap.id,
            rulebook_version=rb.version,
            rule_set=rb.rule_set,
            official=rb.is_official,
            engine_version=ENGINE_VERSION,
            overall=result.overall,
            reference=result.reference,
            confidence=result.confidence,
            stage=stage.stage,
            stage_provisional=stage.provisional,
            trend=trend,
            pillars=[
                {
                    "id": p.id,
                    "name": p.name,
                    "score": _s(p.score),
                    "weight": str(p.weight),
                    "effective_weight": _s(p.effective_weight, "0.0001"),
                    "contribution": _s(p.contribution),
                    "missing_inputs": list(p.missing_inputs),
                }
                for p in result.pillars
            ],  # fmt: skip
            missing_inputs=list(result.missing_inputs),
            dna=[
                {
                    "key": t.key,
                    "label": t.label,
                    "value": t.value,
                    "confidence": _s(t.confidence, "0.01"),
                    "evidence_count": len(t.evidence),
                    "evidence": list(t.evidence),
                    "wording": f"Your finances suggest: {t.value.lower()}",
                }
                for t in traits
            ],  # fmt: skip
            persona=None if persona is None else {"name": persona.name, "description": persona.description},
            computed_at=now,
        )
        self.s.add(run)
        await self.s.flush()
        await audit(self.s, action="score.computed", entity_type="score_run", entity_id=str(run.id), actor_user_id=user_id,
                    request_id=request_id, meta={"rulebook_version": rb.version, "official": rb.is_official,
                                                  "engine_version": ENGINE_VERSION})  # fmt: skip
        bus.publish(self.s, user_id, bus.SCORE_COMPUTED, {"run_id": str(run.id)})
        return run

    @staticmethod
    def explain(run: ScoreRun) -> dict[str, object]:
        """Factor attribution straight from stored deterministic contributions (no model, no LLM)."""
        scored = [p for p in run.pillars if p["score"] is not None]
        ranked = sorted(scored, key=lambda p: D(str(p["contribution"])), reverse=True)
        pos = [p for p in ranked if D(str(p["contribution"])) > 0]
        neg = [p for p in reversed(ranked) if D(str(p["contribution"])) < 0]
        return {
            "overall": _s(run.overall), "reference": _s(run.reference),
            "additivity_note": "overall = reference + sum of pillar contributions",
            "positive_drivers": pos, "negative_drivers": neg, "not_scored": [p for p in run.pillars if p["score"] is None],
            "missing_inputs": run.missing_inputs,
        }  # fmt: skip

    @staticmethod
    def compare(a: ScoreRun, b: ScoreRun) -> dict[str, object]:
        """Why did the score change? Material pillar-level differences between two stored runs (a = older)."""
        a_by = {p["id"]: p for p in a.pillars}
        changes = []
        for p in b.pillars:
            before, after = a_by.get(str(p["id"])), p
            if before is None or before["score"] is None or after["score"] is None:
                continue
            d = D(str(after["contribution"])) - D(str(before["contribution"]))
            if abs(d) >= Decimal("0.5"):  # PLACEHOLDER materiality (points)
                changes.append(
                    {
                        "id": p["id"],
                        "name": p["name"],
                        "score_before": before["score"],
                        "score_after": after["score"],
                        "points_change": _s(d),
                    }
                )
        return {"from_score": _s(a.overall), "to_score": _s(b.overall), "delta": _s(b.overall - a.overall), "material_changes": changes}  # fmt: skip
