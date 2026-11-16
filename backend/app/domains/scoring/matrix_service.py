"""Computes the workbook-based FinScore (15 factors, 0-900) for a user from their stated profile facts.

Stateless on purpose: nothing is persisted, so there is no migration and no score history yet (history/trend for this
model is a follow-up). Every computation IS audited (hash-chained audit log) with a digest of the inputs, the rule-set
version and the engine version, so any result can be reproduced. The rule set is a DRAFT that Product has not approved:
in production this service refuses to run, exactly like the 20-pillar score does.
"""

import hashlib
import json
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.domains.governance.service import audit
from app.domains.profile.catalog import FIELDS
from app.domains.profile.service import ProfileService
from app.domains.scoring.matrix_adapter import liquid_counted_as_debt, to_matrix_inputs
from app.engines.matrix_score import MatrixScoreResult, MatrixScoreSpec, compute_matrix_score
from app.infra.errors import AppError
from app.rulebook.matrix_rules import load_matrix_spec

MATRIX_ENGINE_VERSION = "0.1.0"


@dataclass(frozen=True)
class MatrixScoreRun:
    result: MatrixScoreResult
    digest: str
    computed_at: datetime
    assumptions: tuple[str, ...]  # defaults applied because the user has not stated the fact


def _digest(payload: dict[str, str | None], spec: MatrixScoreSpec) -> str:
    body = {"inputs": payload, "rule_version": spec.version, "engine_version": MATRIX_ENGINE_VERSION}
    return hashlib.sha256(json.dumps(body, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


class MatrixScoringService:
    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self.s, self.cfg = session, settings
        self.profile = ProfileService(session)

    async def compute(self, user_id: uuid.UUID, request_id: str | None = None) -> MatrixScoreRun:
        spec = load_matrix_spec()
        if self.cfg.env == "production" and not spec.official:
            raise AppError(
                503, "rulebook_not_approved", "FinScore is not available yet",
                "The official scoring rules have not been approved by the Product Team.",
            )  # fmt: skip
        raw = await self.profile.raw_inputs(user_id)
        facts = {f.field_key: f.value for f in await self.profile.current_facts(user_id)}
        inputs = to_matrix_inputs(raw, choices={k: v for k, v in facts.items() if k in FIELDS and FIELDS[k].kind == "choice"})
        result = compute_matrix_score(spec, inputs)
        if result.overall is None:
            raise AppError(
                422,
                "insufficient_data",
                "Not enough information to compute a score yet",
                "Tell me a bit more about your finances.",
            )

        assumptions: list[str] = []
        if any(f.id == "F08" and f.status == "scored" for f in result.factors):
            if inputs.retirement_age is None:
                assumptions.append(f"Retirement age {spec.retirement.default_retirement_age} assumed (not provided)")
            if inputs.life_expectancy is None:
                assumptions.append(f"Planning age {spec.retirement.default_life_expectancy} assumed (not provided)")
            if inputs.risk_profile is None:
                assumptions.append(
                    f"Risk profile {spec.risk.default_profile.title()} assumed for the retirement calculation (not provided)"
                )
        if liquid_counted_as_debt(raw):
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
