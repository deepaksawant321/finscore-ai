"""Workbook-based FinScore endpoint (15 factors, age x value matrices, 0-900). Runs alongside the 20-pillar score.

DRAFT rule set derived from the business spreadsheets: always watermarked as not official. See docs/rules/FINSCORE_RULES_SPEC.md.
"""

from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.api.deps import ClientDep, PrincipalDep, SessionDep, SettingsDep
from app.domains.scoring.matrix_adapter import catalogue_key
from app.domains.scoring.matrix_service import MATRIX_ENGINE_VERSION, MatrixScoringService
from app.engines.matrix_score import FactorResult
from app.infra.ratelimit import rate_limit
from app.rulebook.loader import load_rulebook

router = APIRouter(tags=["intelligence"])
WORKBOOK_WATERMARK = "WORKBOOK DRAFT RULES — NOT AN OFFICIAL FINSCORE"


class MatrixFactorOut(BaseModel):
    id: str
    name: str
    weight: str
    status: str = Field(description="scored | missing | not_applicable")
    max_points: str
    value: str | None = Field(description="Value in the matrix unit (percent, rupees lakh, ...)")
    band: str | None
    factor_score: int | None = Field(description="0-10 from the age x value matrix")
    points: str | None
    missing_inputs: list[str]
    reason: str


class MatrixScoreOut(BaseModel):
    overall: str = Field(description="0-900, rescaled over the scored factors")
    score_range: tuple[int, int] = (0, 900)
    confidence: str = Field(description="Share of total factor weight that could be scored (0-1)")
    early_estimate: bool = Field(
        description="True when confidence is below the placeholder threshold: do not announce a verdict."
    )
    message: str | None = Field(description="Indicative message; withheld for early estimates.")
    official: bool
    rule_set: str
    rule_version: str
    engine_version: str
    input_digest: str
    computed_at: datetime
    factors: list[MatrixFactorOut]
    missing_inputs: list[str] = Field(description="Profile fields (catalogue keys) that would let more factors be scored")
    assumptions: list[str]
    notes: list[str]
    watermark: str | None


def _s(x: Decimal | None, places: str = "0.01") -> str | None:
    return None if x is None else format(x.quantize(Decimal(places)), "f")


def _factor(f: FactorResult) -> MatrixFactorOut:
    return MatrixFactorOut(
        id=f.id, name=f.name, weight=format(f.weight, "f"), status=f.status, max_points=_s(f.max_points) or "0.00",
        value=_s(f.value, "0.0001"), band=f.band_label, factor_score=f.factor_score, points=_s(f.points),
        missing_inputs=[catalogue_key(m) for m in f.missing_inputs], reason=f.reason,
    )  # fmt: skip


@router.post("/score/matrix/compute", response_model=MatrixScoreOut, dependencies=[Depends(rate_limit("score", 30, 60))])
async def compute_matrix_score_ep(p: PrincipalDep, session: SessionDep, cfg: SettingsDep, client: ClientDep) -> MatrixScoreOut:
    run = await MatrixScoringService(session, cfg).compute(p.user_id, client.request_id)
    r = run.result
    assert r.overall is not None  # the service raises 422 when nothing could be scored
    early = r.confidence < load_rulebook().min_confidence_for_stage()  # same placeholder threshold as the 20-pillar score
    return MatrixScoreOut(
        overall=_s(r.overall) or "0.00", confidence=format(r.confidence.quantize(Decimal("0.0001")), "f"), early_estimate=early,
        message=None if early else r.message, official=r.official, rule_set=r.rule_set, rule_version=r.version,
        engine_version=MATRIX_ENGINE_VERSION, input_digest=run.digest, computed_at=run.computed_at,
        factors=[_factor(f) for f in r.factors],
        missing_inputs=sorted({catalogue_key(m) for f in r.factors for m in f.missing_inputs}),
        assumptions=list(run.assumptions), notes=list(r.notes), watermark=None if r.official else WORKBOOK_WATERMARK,
    )  # fmt: skip
