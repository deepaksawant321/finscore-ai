"""Quick journey: one screen of answers -> workbook FinScore, then one question at a time to make it more complete."""

from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, model_validator

from app.api.deps import ClientDep, PrincipalDep, SessionDep, SettingsDep
from app.api.v1.matrix_score import MatrixScoreOut, matrix_out
from app.domains.profile.catalog import FIELDS
from app.domains.profile.quick import QuickAnswers, apply
from app.domains.profile.service import ProfileService
from app.domains.scoring.matrix_service import MatrixScoringService
from app.infra.ratelimit import rate_limit

router = APIRouter(tags=["quick"])
# When a value was ASSUMED from the quick score's single savings total, the catalogue question (written for the chat,
# where liquid savings are asked separately) would be misleading; ask about a share of that total instead.
ASSUMED_QUESTION = {
    "debt_holdings": "Of your savings and investments, how much is in bank savings, FDs, PF/PPF, bonds and debt funds?",
    "equity_holdings": "Of your savings and investments, how much is in shares and equity mutual funds?",
}
Money = Field(ge=0, le=Decimal("100000000000"), max_digits=14, decimal_places=2)


class QuickScoreIn(BaseModel):
    age: int = Field(ge=18, le=100)
    monthly_income: Decimal = Field(gt=0, le=Decimal("10000000000"), max_digits=14, decimal_places=2,
                                    description="Household income per month, before tax")  # fmt: skip
    monthly_expenses: Decimal = Money
    monthly_emi: Decimal = Money
    loans_outstanding: Decimal | None = Field(default=None, ge=0, max_digits=14, decimal_places=2,
                                              description="Asked only when monthly_emi > 0")  # fmt: skip
    monthly_investment: Decimal = Money
    savings_total: Decimal = Field(ge=0, max_digits=14, decimal_places=2, description="Savings and investments, not the home")
    mix: Literal["mostly_safe", "balanced", "mostly_equity"]
    other_assets: Decimal = Money
    dependants: int = Field(ge=0, le=20)
    kids: int = Field(ge=0, le=15)
    kids_goal_planned: bool | None = None
    health_cover: Decimal = Money
    life_cover: Decimal = Money
    pending_goals: int = Field(ge=0, le=20)

    @model_validator(mode="after")
    def _consistent(self) -> "QuickScoreIn":
        if self.monthly_emi == 0 and self.loans_outstanding not in (None, Decimal(0)):
            raise ValueError("loans_outstanding must be empty or 0 when there are no EMIs")
        return self


class ImproveOut(BaseModel):
    field_key: str
    label: str
    question: str
    why: str
    kind: str
    unit: str | None
    choices: list[str]
    reason: Literal["missing", "assumed"]
    current_value: str | None = Field(description="The assumed value, for reason=assumed")
    impact: str = Field(description="Factor weight (out of 100) this answer would unlock or firm up")


@router.post("/quick-score", response_model=MatrixScoreOut, dependencies=[Depends(rate_limit("quick-score", 20, 60))])
async def quick_score(
    body: QuickScoreIn, p: PrincipalDep, session: SessionDep, cfg: SettingsDep, client: ClientDep
) -> MatrixScoreOut:
    """Saves the answers (labelled stated / derived / assumed) and returns the workbook FinScore in one call."""
    await apply(ProfileService(session), p.user_id, QuickAnswers(**body.model_dump()), client.request_id)
    return matrix_out(await MatrixScoringService(session, cfg).compute(p.user_id, client.request_id))


@router.get("/score/matrix/improve", response_model=list[ImproveOut])
async def improve(p: PrincipalDep, session: SessionDep, cfg: SettingsDep) -> list[ImproveOut]:
    items = await MatrixScoringService(session, cfg).improvements(p.user_id)
    current = {f.field_key: f.value for f in await ProfileService(session).current_facts(p.user_id)}
    out = []
    for i in items:
        f = FIELDS[i.field_key]
        out.append(ImproveOut(field_key=f.key, label=f.label, question=ASSUMED_QUESTION.get(f.key, f.question) if i.reason == "assumed" else f.question, why=f.why, kind=f.kind, unit=f.unit,
                              choices=list(f.choices), reason=i.reason, current_value=current.get(f.key) if i.reason == "assumed" else None, impact=format(i.impact.normalize(), "f")))  # fmt: skip
    return out
