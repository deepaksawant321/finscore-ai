"""Computes the workbook-based FinScore (15 factors, 0-900) for a user from their profile facts.

Stateless on purpose: nothing is persisted, so there is no migration and no score history yet (history/trend for this
model is a follow-up). Every computation IS audited (hash-chained audit log) with a digest of the inputs, the rule-set
version and the engine version, so any result can be reproduced. The rule set is a DRAFT that Product has not approved:
in production this service refuses to run, exactly like the 20-pillar score does.

Facts may be stated by the user, DERIVED from other facts (profile/derive.py) or ESTIMATED planning assumptions from the
quick score (profile/quick.py). Derived and estimated values are always listed in `assumptions`, so the user sees them.
"""

import hashlib
import json
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.domains.governance.service import audit
from app.domains.profile.catalog import FIELDS
from app.domains.profile.derive import WHY
from app.domains.profile.models import Fact
from app.domains.profile.service import ProfileService
from app.domains.scoring.matrix_adapter import catalogue_key, liquid_counted_as_debt, to_matrix_inputs
from app.engines.matrix_score import MatrixInputs, MatrixScoreResult, MatrixScoreSpec, compute_matrix_score
from app.infra.errors import AppError
from app.rulebook.matrix_rules import load_matrix_spec

MATRIX_ENGINE_VERSION = "0.1.0"

# Which factors each profile field feeds (used to rank "improve accuracy" questions by how much score they unlock).
FIELD_FACTORS: dict[str, tuple[str, ...]] = {
    "monthly_expenses": ("F01", "F02", "F08"), "monthly_emi_total": ("F02", "F09"), "monthly_investment": ("F02", "F10"),
    "equity_holdings": ("F03", "F04", "F05"), "debt_holdings": ("F03", "F04", "F05"), "other_assets": ("F03", "F04"),
    "loans_outstanding": ("F04",), "pending_goals": ("F07",), "retirement_age": ("F08",), "life_expectancy": ("F08",),
    "risk_profile": ("F08",), "life_cover_amount": ("F11",), "health_cover_amount": ("F12",), "dependants": ("F12",),
    "section_80c": ("F13",), "section_80d": ("F14",), "kids": ("F15",), "kids_goal_planned": ("F15",),
}  # fmt: skip


@dataclass(frozen=True)
class MatrixScoreRun:
    result: MatrixScoreResult
    digest: str
    computed_at: datetime
    assumptions: tuple[str, ...]  # defaults, derived values and estimates the user did not state


@dataclass(frozen=True)
class ImproveItem:
    field_key: str
    reason: str  # missing | assumed
    impact: Decimal  # factor weight points this answer would unlock or firm up (0-100 scale)


def _digest(payload: dict[str, str | None], spec: MatrixScoreSpec) -> str:
    body = {"inputs": payload, "rule_version": spec.version, "engine_version": MATRIX_ENGINE_VERSION}
    return hashlib.sha256(json.dumps(body, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def _show(f: Fact) -> str:
    kind = FIELDS[f.field_key].kind
    if kind == "money":
        return f"Rs {Decimal(f.value):,.0f}"
    if kind == "bool":
        return "yes" if f.value == "true" else "no"
    return f.value


class MatrixScoringService:
    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self.s, self.cfg = session, settings
        self.profile = ProfileService(session)

    def _guard(self, spec: MatrixScoreSpec) -> None:
        if self.cfg.env == "production" and not spec.official:
            raise AppError(
                503, "rulebook_not_approved", "FinScore is not available yet",
                "The official scoring rules have not been approved by the Product Team.",
            )  # fmt: skip

    async def _evaluate(self, user_id: uuid.UUID) -> tuple[MatrixScoreSpec, MatrixInputs, MatrixScoreResult, dict[str, Fact]]:
        spec = load_matrix_spec()
        self._guard(spec)
        facts = {f.field_key: f for f in await self.profile.current_facts(user_id)}
        raw = await self.profile.raw_inputs(user_id)
        debt = facts.get("debt_holdings")
        inputs = to_matrix_inputs(
            raw,
            choices={k: f.value for k, f in facts.items() if FIELDS[k].kind == "choice"},
            debt_includes_liquid=debt is not None and debt.source_type == "ESTIMATED",
        )
        return spec, inputs, compute_matrix_score(spec, inputs), facts

    async def compute(self, user_id: uuid.UUID, request_id: str | None = None) -> MatrixScoreRun:
        spec, inputs, result, facts = await self._evaluate(user_id)
        if result.overall is None:
            raise AppError(
                422,
                "insufficient_data",
                "Not enough information to compute a score yet",
                "Tell me a bit more about your finances.",
            )

        assumptions: list[str] = []
        for f in facts.values():
            if f.source_type == "ESTIMATED":
                assumptions.append(f"{FIELDS[f.field_key].label}: {_show(f)} assumed (change it any time on the Memory page)")
            elif f.source_type == "DERIVED":
                why = WHY.get(f.source_ref or "", "it follows from your other answers")
                assumptions.append(f"{FIELDS[f.field_key].label}: {_show(f)}, because {why}")
        if any(f.id == "F08" and f.status == "scored" for f in result.factors):
            if inputs.retirement_age is None:
                assumptions.append(f"Retirement age {spec.retirement.default_retirement_age} assumed (not provided)")
            if inputs.life_expectancy is None:
                assumptions.append(f"Planning age {spec.retirement.default_life_expectancy} assumed (not provided)")
            if inputs.risk_profile is None:
                assumptions.append(
                    f"Risk profile {spec.risk.default_profile.title()} assumed for the retirement calculation (not provided)"
                )
        debt = facts.get("debt_holdings")
        raw = await self.profile.raw_inputs(user_id)
        if liquid_counted_as_debt(raw, debt_includes_liquid=debt is not None and debt.source_type == "ESTIMATED"):
            assumptions.append("Your liquid savings are counted together with your debt investments")

        payload = {k: (None if v is None else str(v)) for k, v in sorted(vars(inputs).items())}
        digest = _digest(payload, spec)
        await audit(
            self.s, action="score.matrix_computed", entity_type="matrix_score", entity_id=digest, actor_user_id=user_id,
            request_id=request_id,
            meta={"rule_version": spec.version, "official": spec.official, "engine_version": MATRIX_ENGINE_VERSION,
                  "confidence": str(result.confidence)},
        )  # fmt: skip
        return MatrixScoreRun(result, digest, datetime.now(UTC), tuple(assumptions))

    async def preview(self, user_id: uuid.UUID) -> MatrixScoreResult | None:
        """The factor results without recording a calculation: used for progress meters and instant facts between
        answers, where no score is shown. None while age or income is unknown. Shown scores go through `compute`."""
        try:
            return (await self._evaluate(user_id))[2]
        except AppError as e:
            if e.code == "insufficient_data":
                return None
            raise

    async def improvements(self, user_id: uuid.UUID) -> list[ImproveItem]:
        """Questions that would make the score more complete, most valuable first. Not audited: no score is shown.
        Missing inputs rank by the weight of the factors they unlock; assumed values (ESTIMATED) by half that weight,
        since the factor is already scored but on an assumption."""
        try:
            _spec, _inputs, result, facts = await self._evaluate(user_id)
        except AppError as e:
            if e.code != "insufficient_data":
                raise
            known = {f.field_key for f in await self.profile.current_facts(user_id)}
            return [ImproveItem(k, "missing", Decimal(100)) for k in ("age", "annual_income") if k not in known]
        weight = {f.id: f.weight for f in result.factors}
        gains: dict[str, Decimal] = {}
        for f in result.factors:
            if f.status == "missing":
                for m in f.missing_inputs:
                    k = catalogue_key(m)
                    gains[k] = gains.get(k, Decimal(0)) + f.weight
        items = [ImproveItem(k, "missing", g) for k, g in gains.items()]
        for k, fact in facts.items():
            if fact.source_type == "ESTIMATED" and k not in gains:
                items.append(
                    ImproveItem(k, "assumed", sum((weight.get(x, Decimal(0)) for x in FIELD_FACTORS.get(k, ())), Decimal(0)) / 2)
                )
        return sorted(items, key=lambda i: (-i.impact, i.reason != "missing", i.field_key))
