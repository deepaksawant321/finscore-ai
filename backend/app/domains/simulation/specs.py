import uuid
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, Field


class ScoreWhatIf(BaseModel):
    """Change some of your stated facts and see how the (demo) score would move. Nothing is saved."""

    kind: Literal["score_what_if"] = "score_what_if"
    overrides: dict[str, str] = Field(min_length=1, max_length=5)


class Invest(BaseModel):
    kind: Literal["invest"] = "invest"
    monthly_amount: Decimal = Field(ge=0, le=Decimal("1e9"))
    lumpsum: Decimal = Field(default=Decimal(0), ge=0, le=Decimal("1e12"))
    years: int = Field(ge=1, le=60)
    return_pct: Decimal  # required: no default return exists (D-B7)
    inflation_pct: Decimal | None = None


class GoalWhatIf(BaseModel):
    kind: Literal["goal_what_if"] = "goal_what_if"
    goal_id: uuid.UUID
    new_monthly_funding: Decimal = Field(ge=0, le=Decimal("1e9"))
    return_pct: Decimal
    inflation_pct: Decimal


ScenarioSpec = Annotated[ScoreWhatIf | Invest | GoalWhatIf, Field(discriminator="kind")]
