"""Pure action engine: applicability, the concrete change an action proposes, completion checks and the composite priority.

The action LIBRARY and priority scales are Rulebook data (PENDING PRODUCT APPROVAL, D-B6; a demo set ships watermarked).
Nothing here invents a score effect: the effect of an action is the difference the SCORE ENGINE computes between the user's
current inputs and the inputs after the action's proposed change (the service does that; this module only builds the change).
"""

from dataclasses import dataclass
from decimal import Decimal

from app.engines.money import D, round_money

Value = Decimal | bool
Inputs = dict[str, Decimal | bool | None]
OPS = ("lt", "lte", "gt", "gte", "eq")
EFFORTS = ("low", "medium", "high")
URGENCIES = ("high", "medium", "low")
CHANGE_KINDS = ("set", "multiple_of", "target_savings_rate", "target_debt_ratio")


@dataclass(frozen=True)
class Cond:
    input: str
    op: str
    value: Value

    def holds(self, inputs: Inputs) -> bool | None:
        """None when the input is unknown (an unknown is never treated as true or false)."""
        x = inputs.get(self.input)
        if x is None:
            return None
        if isinstance(self.value, bool) or isinstance(x, bool):
            return bool(x == self.value) if self.op == "eq" else None
        return {
            "lt": x < self.value,
            "lte": x <= self.value,
            "gt": x > self.value,
            "gte": x >= self.value,
            "eq": x == self.value,
        }[self.op]


@dataclass(frozen=True)
class Change:
    kind: str
    field: str  # the stated fact that would change
    value: Value | None = None  # kind=set: the new value; kind=target_*: the target ratio; kind=multiple_of: the factor
    of: str | None = None  # kind=multiple_of: the input it is a multiple of


@dataclass(frozen=True)
class ActionSpec:
    key: str
    title: str
    why: str
    cta: str  # text with {target}: what to do, filled with the computed target
    pillar: str
    applies: Cond  # the gap this action addresses
    done: Cond  # when the gap is closed (used for verification)
    change: Change
    effort: str
    urgency: str
    time_to_impact_weeks: int
    supports_goals: bool
    verify_field: str


@dataclass(frozen=True)
class PriorityConfig:
    weights: dict[str, Decimal]  # factor -> max points; PROPOSED (blueprint 12)
    urgency_points: dict[str, Decimal]  # PLACEHOLDER scales
    ease_points: dict[str, Decimal]
    max_actions: int


def applicable(spec: ActionSpec, inputs: Inputs) -> bool:
    """An action is offered only when the gap is KNOWN to exist (unknown data is a question for the interview, not an action)."""
    return spec.applies.holds(inputs) is True


def is_done(spec: ActionSpec, inputs: Inputs) -> bool:
    return spec.done.holds(inputs) is True


def proposed_change(spec: ActionSpec, inputs: Inputs) -> dict[str, Value] | None:
    """The concrete new value(s) of stated facts if the user does this. None when the needed inputs are unknown."""
    c = spec.change
    if c.kind == "set":
        return {c.field: c.value} if c.value is not None else None
    income = inputs.get("monthly_income")
    if c.kind == "multiple_of":
        base = inputs.get(c.of or "")
        return {c.field: round_money(D(str(c.value)) * base)} if isinstance(base, Decimal) and c.value is not None else None
    if not isinstance(income, Decimal) or c.value is None:
        return None
    ratio = D(str(c.value))
    if c.kind == "target_savings_rate":  # spend so that (income - expenses) / income == ratio
        return {c.field: round_money(income * (1 - ratio))}
    if c.kind == "target_debt_ratio":  # EMIs so that EMI / income == ratio
        return {c.field: round_money(income * ratio)}
    return None


def rupee_effect_per_year(spec: ActionSpec, inputs: Inputs, change: dict[str, Value]) -> Decimal:
    """Yearly rupee movement the change represents (0 for yes/no actions). Used only to rank, never shown as a promise."""
    old, new = inputs.get(spec.change.field), change.get(spec.change.field)
    if not isinstance(old, Decimal) or not isinstance(new, Decimal):
        return Decimal(0)
    gap = abs(new - old)
    return gap if spec.change.kind == "multiple_of" else gap * 12  # a monthly change recurs every month


@dataclass(frozen=True)
class Candidate:
    spec: ActionSpec
    change: dict[str, Value]
    score_delta: Decimal  # computed by the score engine
    rupees_per_year: Decimal
    min_input_confidence: Decimal
    has_active_goal: bool


@dataclass(frozen=True)
class Breakdown:
    impact: Decimal
    financial_impact: Decimal
    urgency: Decimal
    ease: Decimal
    confidence: Decimal
    goal_alignment: Decimal

    @property
    def total(self) -> Decimal:
        return self.impact + self.financial_impact + self.urgency + self.ease + self.confidence + self.goal_alignment


def _scaled(maximum: Decimal, value: Decimal, top: Decimal) -> Decimal:
    return Decimal(0) if top <= 0 or value <= 0 else min(maximum, maximum * value / top)


def prioritise(cands: list[Candidate], cfg: PriorityConfig) -> list[tuple[Candidate, Breakdown]]:
    """Composite priority = impact + financial impact + urgency + ease + confidence + goal alignment (weights PROPOSED).
    Impact and financial impact are relative to the largest value among today's candidates. Deterministic: ties break by key."""
    live = [c for c in cands if c.score_delta > 0]  # no computed effect under the rules => not offered
    if not live:
        return []
    max_delta = max(c.score_delta for c in live)
    max_rupees = max(c.rupees_per_year for c in live)
    w = cfg.weights
    scored = []
    for c in live:
        bd = Breakdown(
            impact=_scaled(w["impact"], c.score_delta, max_delta),
            financial_impact=_scaled(w["financial_impact"], c.rupees_per_year, max_rupees),
            urgency=min(w["urgency"], cfg.urgency_points[c.spec.urgency]),
            ease=min(w["ease"], cfg.ease_points[c.spec.effort]),
            confidence=min(w["confidence"], w["confidence"] * c.min_input_confidence),
            goal_alignment=w["goal_alignment"] if (c.spec.supports_goals and c.has_active_goal) else Decimal(0),
        )
        scored.append((c, bd))
    scored.sort(key=lambda t: (-t[1].total, t[0].spec.key))
    return scored[: cfg.max_actions]
