"""Pure health-monitor engine: green/amber/red vitals from deterministic inputs, a data-quality verdict, and a classification of
what changed between two checks. Thresholds are Rulebook data (PENDING PRODUCT APPROVAL, B18; a demo set ships watermarked).

Key rule (PRD): deterioration of the user's HEALTH is kept separate from deterioration of DATA QUALITY. A vital that turns red only
because it was measured for the first time, or a number that has merely gone stale, is NOT reported as health getting worse."""

from dataclasses import dataclass
from decimal import Decimal

STATUS_ORDER = {"green": 0, "amber": 1, "red": 2}
Value = Decimal | bool | None


@dataclass(frozen=True)
class VitalSpec:
    key: str
    label: str
    input: str
    kind: str  # higher (bigger is healthier) | lower (smaller is healthier) | flag (yes is healthy)
    green: Decimal | bool
    amber: Decimal | None  # None for flags
    unit: str  # percent | months | flag


@dataclass(frozen=True)
class VitalState:
    status: str  # green | amber | red | unknown
    known: bool
    stale: bool
    value: str | None  # canonical string of the underlying number (None when unknown)


@dataclass(frozen=True)
class HealthEvent:
    vital: str
    kind: str  # health_worse | health_better | newly_measured | went_stale | refreshed
    from_status: str
    to_status: str

    @property
    def is_health_change(self) -> bool:
        return self.kind in ("health_worse", "health_better")


def vital_status(spec: VitalSpec, value: Value) -> str:
    if value is None:
        return "unknown"
    if spec.kind == "flag":
        return "green" if value is True else "red"
    if isinstance(value, bool) or not isinstance(spec.green, Decimal) or spec.amber is None:
        return "unknown"
    if spec.kind == "higher":
        return "green" if value >= spec.green else ("amber" if value >= spec.amber else "red")
    return "green" if value <= spec.green else ("amber" if value <= spec.amber else "red")  # lower is better


def overall_status(states: list[VitalState]) -> str:
    """The worst KNOWN vital. Unknown vitals never make the overall status better or worse; they lower data quality instead."""
    known = [s.status for s in states if s.known]
    return max(known, key=lambda s: STATUS_ORDER[s]) if known else "unknown"


def headline_status(overall: str, any_unmeasured: bool) -> str:
    """What to tell the user first. "incomplete" instead of green while any vital is unmeasured: the worst KNOWN vital being
    green says nothing about the unknown ones (e.g. no insurance), so "Healthy" would be false reassurance. Amber and red stay
    as they are: they are true warnings whatever is missing."""
    if overall in ("green", "unknown") and any_unmeasured:
        return "incomplete"
    return overall


def data_quality(states: list[VitalState], fair_known_share: Decimal) -> str:
    """good: everything measured and fresh. fair: most measured, at most one stale. poor: otherwise."""
    if not states:
        return "poor"
    share = Decimal(sum(1 for s in states if s.known)) / Decimal(len(states))
    stale = sum(1 for s in states if s.known and s.stale)
    if share == 1 and stale == 0:
        return "good"
    return "fair" if share >= fair_known_share and stale <= 1 else "poor"


def classify_changes(prev: dict[str, VitalState] | None, curr: dict[str, VitalState]) -> list[HealthEvent]:
    out: list[HealthEvent] = []
    for key in sorted(curr):
        c = curr[key]
        p = prev.get(key) if prev else None
        if p is None or (not p.known and c.known):
            if c.known and prev is not None:  # the very first check has nothing to compare with
                out.append(HealthEvent(key, "newly_measured", "unknown", c.status))
            continue
        if p.known and c.known and p.status != c.status:
            worse = STATUS_ORDER[c.status] > STATUS_ORDER[p.status]
            out.append(HealthEvent(key, "health_worse" if worse else "health_better", p.status, c.status))
        if c.known and p.known and not p.stale and c.stale:
            out.append(HealthEvent(key, "went_stale", p.status, c.status))
        elif c.known and p.known and p.stale and not c.stale:
            out.append(HealthEvent(key, "refreshed", p.status, c.status))
    return out
