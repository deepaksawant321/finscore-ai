from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True)
class Stage:
    name: str
    lo: int
    hi: int


@dataclass(frozen=True)
class StageResult:
    stage: str
    provisional: bool  # True while the age x FinScore matrix is not supplied/approved
    basis: str


def band_stage(score: Decimal, stages: tuple[Stage, ...]) -> Stage:
    """Stage by score band only (deck slide 4). Score is rounded half-up to an integer first."""
    s = int(score.to_integral_value(rounding="ROUND_HALF_UP"))
    for st in stages:
        if st.lo <= s <= st.hi:
            return st
    raise ValueError(f"score {s} outside configured stage bands")


def resolve_stage(score: Decimal, age: int | None, stages: tuple[Stage, ...], matrix: object | None) -> StageResult:
    """Age x FinScore matrix is PENDING PRODUCT APPROVAL: until supplied, return the band stage flagged provisional."""
    if matrix is None:
        return StageResult(band_stage(score, stages).name, True, "score band only; age x score matrix not yet approved")
    raise NotImplementedError("age x score matrix evaluation is implemented once Product supplies its format (D-B4)")
