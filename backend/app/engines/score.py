"""Deterministic scoring framework. All parameters (weights, scales, ranges) are injected from the Rulebook;
this module contains NO business constants. Pure: no I/O, no clock, no randomness."""

from collections.abc import Mapping
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Literal

from app.engines.money import D

Inputs = Mapping[str, Decimal | bool | None]


@dataclass(frozen=True)
class Measure:
    """How one pillar's 0-100 score is derived from inputs.

    linear:       score = clamp((x - lo) / (hi - lo)) * 100   (lo may be > hi for 'lower is better')
    boolean_sum:  score = 100 * (number of true flags) / len(inputs)
    """

    kind: Literal["linear", "boolean_sum"]
    inputs: tuple[str, ...]
    lo: Decimal | None = None
    hi: Decimal | None = None


@dataclass(frozen=True)
class PillarSpec:
    id: str
    name: str
    weight: Decimal
    measure: Measure | None = None  # None => no calculator defined (pillar can never be scored yet)


@dataclass(frozen=True)
class ScoreSpec:
    min_score: Decimal
    max_score: Decimal
    reference_pillar_score: Decimal
    pillars: tuple[PillarSpec, ...]


@dataclass(frozen=True)
class PillarResult:
    id: str
    name: str
    score: Decimal | None  # 0-100, None when not computable
    weight: Decimal
    effective_weight: Decimal  # weight / sum(weights of scored pillars); 0 when not scored
    contribution: Decimal  # points above/below the reference score; 0 when not scored
    missing_inputs: tuple[str, ...] = ()


@dataclass(frozen=True)
class ScoreResult:
    overall: Decimal | None
    reference: Decimal
    confidence: Decimal  # share of total pillar weight that could be scored (0..1)
    pillars: tuple[PillarResult, ...]
    missing_inputs: tuple[str, ...] = field(default=())


def _clamp(x: Decimal, lo: Decimal, hi: Decimal) -> Decimal:
    return max(lo, min(hi, x))


def pillar_score(measure: Measure, inputs: Inputs) -> tuple[Decimal | None, tuple[str, ...]]:
    missing = tuple(k for k in measure.inputs if inputs.get(k) is None)
    if missing:
        return None, missing
    if measure.kind == "boolean_sum":
        flags = [bool(inputs[k]) for k in measure.inputs]
        return D(100) * sum(flags) / len(flags), ()
    assert measure.lo is not None and measure.hi is not None and measure.lo != measure.hi
    x = inputs[measure.inputs[0]]
    assert isinstance(x, Decimal)
    frac = _clamp((x - measure.lo) / (measure.hi - measure.lo), D(0), D(1))
    return frac * 100, ()


def compute_score(spec: ScoreSpec, inputs: Inputs) -> ScoreResult:
    """Overall = min + (max-min) * sum(effective_weight_i * pillar_i) / 100 over scored pillars.

    Additivity (tested): overall == reference + sum(contribution_i), where reference = min + (max-min) * ref/100
    and contribution_i = (max-min) * effective_weight_i * (pillar_i - ref) / 100.
    Missing data lowers CONFIDENCE (share of weight scored), it is never treated as zero.
    """
    span = spec.max_score - spec.min_score
    scored: list[tuple[PillarSpec, Decimal]] = []
    missing_by_pillar: dict[str, tuple[str, ...]] = {}
    for p in spec.pillars:
        if p.measure is None:
            continue
        s, missing = pillar_score(p.measure, inputs)
        if s is None:
            missing_by_pillar[p.id] = missing
        else:
            scored.append((p, s))
    total_weight = sum((p.weight for p in spec.pillars), D(0))
    scored_weight = sum((p.weight for p, _ in scored), D(0))
    reference = spec.min_score + span * spec.reference_pillar_score / 100
    confidence = scored_weight / total_weight if total_weight else D(0)
    results: list[PillarResult] = []
    scores = {p.id: s for p, s in scored}
    for p in spec.pillars:
        s = scores.get(p.id)
        if s is None:
            results.append(PillarResult(p.id, p.name, None, p.weight, D(0), D(0), missing_by_pillar.get(p.id, ())))
        else:
            ew = p.weight / scored_weight
            contrib = span * ew * (s - spec.reference_pillar_score) / 100
            results.append(PillarResult(p.id, p.name, s, p.weight, ew, contrib))
    if not scored:
        return ScoreResult(
            None, reference, confidence, tuple(results), tuple(sorted({m for v in missing_by_pillar.values() for m in v}))
        )
    overall = reference + sum((r.contribution for r in results), D(0))
    missing = tuple(sorted({m for v in missing_by_pillar.values() for m in v}))
    return ScoreResult(overall, reference, confidence, tuple(results), missing)
