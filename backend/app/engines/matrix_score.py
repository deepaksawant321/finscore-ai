"""Workbook-based FinScore: 15 factors, each scored 0-10 from an age-band x value-band matrix, weighted to 0-900.

Source: docs/rules/FINSCORE_RULES_SPEC.md (derived from MasterSheet of FinScore.xlsx). This module contains NO business
constants: weights, matrices, cut points and calculator rates arrive in a `MatrixScoreSpec` built by
`app.rulebook.matrix_rules`. Pure: no I/O, no clock, no randomness. Decimal only (floats are rejected by `D`).

Missing data lowers CONFIDENCE, never scores a factor as zero (Rulebook invariant 5): factors whose inputs are unknown
or not applicable are excluded and the total is rescaled over the scored factors.
"""

from bisect import bisect_right
from collections.abc import Mapping
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Literal

from app.engines.finmath import retirement_plan
from app.engines.money import D

ValueKind = Literal["percent", "rupees_lakh", "rupees_thousand", "count", "flag"]
_DIVISOR = {
    "percent": D(1),  # percent values are built already multiplied by 100
    "rupees_lakh": D(100_000),
    "rupees_thousand": D(1_000),
    "count": D(1),
    "flag": D(1),
}
FactorStatus = Literal["scored", "missing", "not_applicable"]


@dataclass(frozen=True)
class MatrixSpec:
    id: str
    kind: ValueKind
    cuts: tuple[Decimal, ...]  # ascending boundaries in the matrix unit; boundary value falls in the HIGHER band
    zero_exact: bool  # value == 0 is its own first band
    band_labels: tuple[str, ...]
    rows: tuple[tuple[int, ...], ...]  # one row per age band; each cell is a 0-10 factor score


@dataclass(frozen=True)
class FactorSpec:
    id: str
    name: str
    weight: Decimal
    matrices: tuple[str, ...]  # one, or three for health (dependants 0 / 1-2 / 3+)
    flags: str  # which of Positive / Negative / Action-area the workbook allows ("P N A", "P", "-")


@dataclass(frozen=True)
class RetirementAssumptions:
    inflation: Decimal
    annuity_rate: Decimal
    default_retirement_age: int
    default_life_expectancy: int
    insurance_discount_rate: Decimal


@dataclass(frozen=True)
class RiskProfileSpec:
    option_scores: tuple[tuple[int, ...], ...]  # [question][option-1] -> score
    bands: tuple[tuple[int, str], ...]  # (max total, profile name), ascending
    annual_return: Mapping[str, Decimal]
    default_profile: str


@dataclass(frozen=True)
class MatrixScoreSpec:
    version: str
    rule_set: str  # human label, e.g. "WORKBOOK DRAFT - NOT OFFICIAL"
    official: bool
    scale_max: Decimal
    age_upper: tuple[int | None, ...]  # inclusive upper age of each age band; last is None
    age_labels: tuple[str, ...]
    factors: tuple[FactorSpec, ...]
    matrices: Mapping[str, MatrixSpec]
    messages: tuple[tuple[Decimal, str], ...]  # (lower bound inclusive, text), ascending
    retirement: RetirementAssumptions
    risk: RiskProfileSpec
    savings_deducts_investments: bool = True  # Master workbook formula; Corporate workbook does not deduct (open item)

    @property
    def total_weight(self) -> Decimal:
        return sum((f.weight for f in self.factors), D(0))


@dataclass(frozen=True)
class MatrixInputs:
    """Client facts in RUPEES (monthly for income/expenses/EMI/investments; totals for balances and cover; annual for 80C/80D).
    None means unknown: the factors that need it are excluded and confidence falls."""

    age: int
    monthly_income: Decimal
    monthly_expenses: Decimal | None = None
    total_emi: Decimal | None = None
    loans_outstanding: Decimal | None = None
    equity: Decimal | None = None
    debt: Decimal | None = None
    other_assets: Decimal | None = None
    monthly_investments: Decimal | None = None
    pending_goals: int | None = None
    life_cover: Decimal | None = None
    health_cover: Decimal | None = None
    dependants: int | None = None
    kids: int | None = None
    kids_goal_planned: bool | None = None
    section_80c: Decimal | None = None
    section_80d: Decimal | None = None
    retirement_age: int | None = None
    life_expectancy: int | None = None
    risk_profile: str | None = None


@dataclass(frozen=True)
class FactorResult:
    id: str
    name: str
    weight: Decimal
    status: FactorStatus
    max_points: Decimal
    value: Decimal | None = None  # in the matrix unit (percent, rupees lakh, ...)
    band_label: str | None = None
    factor_score: int | None = None  # 0-10
    points: Decimal | None = None
    ratio: Decimal | None = None  # points / max_points; drives Positive/Negative/Action flags (thresholds not yet defined)
    flags: str = "-"
    missing_inputs: tuple[str, ...] = ()
    reason: str = ""


@dataclass(frozen=True)
class MatrixScoreResult:
    overall: Decimal | None  # 0..scale_max, rescaled over scored factors; None when nothing could be scored
    raw_points: Decimal  # sum of points actually earned
    max_points_scored: Decimal  # max points of the scored factors
    confidence: Decimal  # scored weight / total weight (0..1)
    message: str | None
    factors: tuple[FactorResult, ...]
    rule_set: str
    version: str
    official: bool
    notes: tuple[str, ...] = field(default=())


# --------------------------------------------------------------------------------------------- lookup


def age_band_index(spec: MatrixScoreSpec, age: int) -> int:
    if age < 0 or age > 120:
        raise ValueError("age out of range")
    for i, upper in enumerate(spec.age_upper):
        if upper is None or age <= upper:
            return i
    raise ValueError("age bands must end with an open band")  # unreachable for a valid spec


def value_band_index(m: MatrixSpec, value: Decimal) -> int:
    if m.zero_exact and value == 0:
        return 0
    return (1 if m.zero_exact else 0) + bisect_right(m.cuts, value)


def lookup(spec: MatrixScoreSpec, matrix_id: str, age: int, value: Decimal) -> tuple[int, str]:
    """Factor score (0-10) and band label for an age and a value expressed in the matrix unit."""
    m = spec.matrices[matrix_id]
    band = value_band_index(m, value)
    return m.rows[age_band_index(spec, age)][band], m.band_labels[band]


# --------------------------------------------------------------------------------------------- scoring


def _points(spec: MatrixScoreSpec, f: FactorSpec, factor_score: int) -> tuple[Decimal, Decimal]:
    mx = spec.scale_max / spec.total_weight * f.weight
    return mx, Decimal(factor_score) / 10 * mx


def points_from_factor_scores(spec: MatrixScoreSpec, scores: Mapping[str, int]) -> Decimal:
    """Total points from already-known 0-10 factor scores keyed by factor id (e.g. the workbooks' manual 'points scored')."""
    total = D(0)
    for f in spec.factors:
        total += _points(spec, f, scores[f.id])[1]
    return total


def _need(**named: object) -> tuple[str, ...]:
    return tuple(k for k, v in named.items() if v is None)


def _percent(num: Decimal, den: Decimal) -> Decimal:
    return num / den * 100


def compute_matrix_score(spec: MatrixScoreSpec, x: MatrixInputs) -> MatrixScoreResult:
    if x.monthly_income <= 0:
        raise ValueError("monthly_income must be > 0")
    age_label = spec.age_labels[age_band_index(spec, x.age)]
    inc = x.monthly_income
    results: list[FactorResult] = []
    notes: list[str] = []

    def done(f: FactorSpec, matrix_id: str, value: Decimal, shown: str) -> FactorResult:
        m = spec.matrices[matrix_id]
        v = value / _DIVISOR[m.kind]
        score, label = lookup(spec, matrix_id, x.age, v)
        mx, pts = _points(spec, f, score)
        return FactorResult(
            f.id, f.name, f.weight, "scored", mx, v, label, score, pts, pts / mx if mx else D(0), f.flags,
            reason=f"{f.name}: {shown} falls in '{label}' for age band {age_label} -> {score}/10 = {pts.quantize(D('0.01'))} of {mx} points",
        )  # fmt: skip

    def skip(f: FactorSpec, status: FactorStatus, why: str, missing: tuple[str, ...] = ()) -> FactorResult:
        mx = spec.scale_max / spec.total_weight * f.weight
        return FactorResult(f.id, f.name, f.weight, status, mx, flags=f.flags, missing_inputs=missing, reason=f"{f.name}: {why}")

    for f in spec.factors:
        fid = f.id
        # ---- derive the factor's raw value from the inputs; each branch returns exactly one FactorResult
        if fid == "F01":
            miss = _need(monthly_expenses=x.monthly_expenses)
            if miss or x.monthly_expenses is None:
                results.append(skip(f, "missing", "needs monthly expenses", miss))
                continue
            v = _percent(inc - x.monthly_expenses, inc)
            results.append(done(f, "cashflow", v, f"cashflow {v:.1f}% of income"))
        elif fid == "F02":
            miss = _need(monthly_expenses=x.monthly_expenses, total_emi=x.total_emi)
            if spec.savings_deducts_investments:
                miss += _need(monthly_investments=x.monthly_investments)
            if miss or x.monthly_expenses is None or x.total_emi is None:
                results.append(
                    skip(
                        f,
                        "missing",
                        "needs expenses, EMIs" + (" and investments" if spec.savings_deducts_investments else ""),
                        miss,
                    )
                )
                continue
            out = (
                x.monthly_expenses + x.total_emi + ((x.monthly_investments or D(0)) if spec.savings_deducts_investments else D(0))
            )
            v = _percent(inc - out, inc)
            results.append(done(f, "savings", v, f"savings {v:.1f}% of income"))
        elif fid in ("F03", "F04"):
            miss = _need(equity=x.equity, debt=x.debt, other_assets=x.other_assets)
            if fid == "F04":
                miss += _need(loans_outstanding=x.loans_outstanding)
            if miss or x.equity is None or x.debt is None or x.other_assets is None:
                results.append(skip(f, "missing", "needs assets" + (" and loans" if fid == "F04" else ""), miss))
                continue
            assets = x.equity + x.debt + x.other_assets
            val = assets - (x.loans_outstanding or D(0)) if fid == "F04" else assets
            results.append(
                done(f, "networth" if fid == "F04" else "assets", val, f"{'net worth' if fid == 'F04' else 'assets'} Rs {val}")
            )
        elif fid == "F05":
            miss = _need(equity=x.equity, debt=x.debt)
            if miss or x.equity is None or x.debt is None:
                results.append(skip(f, "missing", "needs equity and debt holdings", miss))
                continue
            if x.equity + x.debt == 0:
                results.append(skip(f, "not_applicable", "no equity or debt holdings, allocation undefined"))
                continue
            v = _percent(x.equity, x.equity + x.debt)
            results.append(done(f, "portfolio_allocation", v, f"equity {v:.1f}% of equity+debt"))
        elif fid == "F06":
            results.append(done(f, "income_range", inc * 12, f"annual income Rs {inc * 12}"))
        elif fid == "F07":
            if x.pending_goals is None:
                results.append(skip(f, "missing", "needs number of pending goals", ("pending_goals",)))
                continue
            results.append(done(f, "pending_goals", D(x.pending_goals), f"{x.pending_goals} pending goals"))
        elif fid == "F08":
            miss = _need(monthly_expenses=x.monthly_expenses)
            if miss or x.monthly_expenses is None:
                results.append(skip(f, "missing", "needs monthly expenses", miss))
                continue
            ret_age = x.retirement_age if x.retirement_age is not None else spec.retirement.default_retirement_age
            life = x.life_expectancy if x.life_expectancy is not None else spec.retirement.default_life_expectancy
            profile = x.risk_profile or spec.risk.default_profile
            surplus = inc - x.monthly_expenses
            if ret_age <= x.age or life <= ret_age:
                v = Decimal("Infinity")  # already at/after retirement age: no time to build the corpus
                notes.append("F08: retirement age <= current age, retirement readiness scored in the lowest band")
            elif surplus <= 0:
                v = Decimal("Infinity")  # no surplus to fund any SIP
            else:
                plan = retirement_plan(
                    monthly_expense=x.monthly_expenses, age=x.age, retirement_age=ret_age, life_expectancy=life,
                    inflation=spec.retirement.inflation, annuity_rate=spec.retirement.annuity_rate,
                    profile_annual_return=spec.risk.annual_return[profile],
                )  # fmt: skip
                v = _percent(plan.monthly_sip, surplus)
            m = spec.matrices["retirement_sip"]
            score, label = lookup(spec, "retirement_sip", x.age, v)
            mx, pts = _points(spec, f, score)
            shown = "no surplus or no time to retire" if v.is_infinite() else f"required SIP is {v:.1f}% of monthly surplus"
            results.append(FactorResult(
                fid, f.name, f.weight, "scored", mx, None if v.is_infinite() else v, label, score, pts, pts / mx, f.flags,
                reason=f"{f.name}: {shown} -> '{label}' for age band {age_label} -> {score}/10 ({m.id})",
            ))  # fmt: skip
        elif fid == "F09":
            miss = _need(total_emi=x.total_emi)
            if miss or x.total_emi is None:
                results.append(skip(f, "missing", "needs total EMIs", miss))
                continue
            v = _percent(x.total_emi, inc)
            results.append(done(f, "foir", v, f"EMIs {v:.1f}% of income"))
        elif fid == "F10":
            miss = _need(monthly_investments=x.monthly_investments)
            if miss or x.monthly_investments is None:
                results.append(skip(f, "missing", "needs monthly investments", miss))
                continue
            v = _percent(x.monthly_investments, inc)
            results.append(done(f, "invested_surplus", v, f"investing {v:.1f}% of income"))
        elif fid == "F11":
            if x.life_cover is None:
                results.append(skip(f, "missing", "needs life cover", ("life_cover",)))
                continue
            results.append(done(f, "life_insurance", x.life_cover, f"life cover Rs {x.life_cover}"))
        elif fid == "F12":
            miss = _need(health_cover=x.health_cover, dependants=x.dependants)
            if miss or x.health_cover is None or x.dependants is None:
                results.append(skip(f, "missing", "needs health cover and number of dependants", miss))
                continue
            mid = f.matrices[0] if x.dependants == 0 else (f.matrices[1] if x.dependants <= 2 else f.matrices[2])
            results.append(done(f, mid, x.health_cover, f"health cover Rs {x.health_cover} with {x.dependants} dependants"))
        elif fid in ("F13", "F14"):
            amt = x.section_80c if fid == "F13" else x.section_80d
            if amt is None:
                results.append(
                    skip(
                        f,
                        "missing",
                        f"needs {'80C' if fid == 'F13' else '80D'} amount",
                        ("section_80c" if fid == "F13" else "section_80d",),
                    )
                )
                continue
            results.append(done(f, "tax_80c" if fid == "F13" else "tax_80d", amt, f"{'80C' if fid == 'F13' else '80D'} Rs {amt}"))
        elif fid == "F15":
            if x.kids is None:
                results.append(skip(f, "missing", "needs number of kids", ("kids",)))
                continue
            if x.kids == 0:
                results.append(skip(f, "not_applicable", "no kids, factor excluded and the score rescaled"))
                continue
            if x.kids_goal_planned is None:
                results.append(skip(f, "missing", "needs whether goals for kids are planned", ("kids_goal_planned",)))
                continue
            results.append(
                done(
                    f,
                    "kids_goals",
                    D(0 if x.kids_goal_planned else 1),
                    "kids goals planned" if x.kids_goal_planned else "kids goals not planned",
                )
            )
        else:
            raise ValueError(f"unknown factor id {fid}")

    scored = [r for r in results if r.status == "scored"]
    raw = sum((r.points or D(0) for r in scored), D(0))
    mx_scored = sum((r.max_points for r in scored), D(0))
    scored_weight = sum((r.weight for r in scored), D(0))
    confidence = scored_weight / spec.total_weight
    if mx_scored == 0:
        return MatrixScoreResult(
            None, raw, mx_scored, confidence, None, tuple(results), spec.rule_set, spec.version, spec.official, tuple(notes)
        )
    overall = spec.scale_max * raw / mx_scored
    if confidence < 1:
        notes.append(
            "Some factors are missing or not applicable: the score is rescaled over the scored factors and confidence is below 1"
        )
    message = None
    for lower, text in spec.messages:
        if overall >= lower:
            message = text
    if message is None and spec.messages:
        message = spec.messages[0][1]
    return MatrixScoreResult(
        overall, raw, mx_scored, confidence, message, tuple(results), spec.rule_set, spec.version, spec.official, tuple(notes)
    )


# --------------------------------------------------------------------------------------------- risk profile


def risk_profile_total(spec: RiskProfileSpec, answers: tuple[int, ...]) -> int:
    """Sum of option scores. `answers[i]` is the 1-5 option chosen for question i+1."""
    if len(answers) != len(spec.option_scores):
        raise ValueError(f"expected {len(spec.option_scores)} answers")
    total = 0
    for q, a in zip(spec.option_scores, answers, strict=True):
        if not 1 <= a <= len(q):
            raise ValueError("answer out of range")
        total += q[a - 1]
    return total


def risk_profile(spec: RiskProfileSpec, answers: tuple[int, ...]) -> tuple[str, int]:
    total = risk_profile_total(spec, answers)
    for upper, name in spec.bands:
        if total <= upper:
            return name, total
    return spec.bands[-1][1], total
