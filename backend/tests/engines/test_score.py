from decimal import Decimal

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from app.engines.money import D
from app.engines.score import compute_score
from app.engines.stage import band_stage, resolve_stage
from app.engines.traits import evaluate_trait, pick_persona
from app.rulebook.loader import RulebookNotApproved, assert_official_allowed, load_rulebook

RB = load_rulebook()
SPEC = RB.score_spec()
FULL = {
    "savings_rate": D("0.2"), "emergency_months": D(3), "debt_to_income": D("0.2"),
    "has_term_insurance": True, "has_health_insurance": False,
}  # fmt: skip


def test_demo_rulebook_is_watermarked_and_not_official() -> None:
    assert "NOT OFFICIAL" in RB.rule_set
    assert not RB.is_official
    assert "score.stage_matrix" in RB.blocking_items and "score.weights" in RB.blocking_items


def test_production_guard_blocks_unapproved_rulebook() -> None:
    with pytest.raises(RulebookNotApproved):
        assert_official_allowed(RB, "production")
    assert_official_allowed(RB, "local")  # dev/test allowed (output is watermarked)


def test_weights_sum_to_one_and_twenty_pillars() -> None:
    assert len(SPEC.pillars) == 20
    assert sum(p.weight for p in SPEC.pillars) == Decimal(1)


def test_stage_bands_cover_300_to_900_without_gaps_or_overlaps() -> None:
    stages = RB.stages()
    assert [s.name for s in stages] == [
        "Dependency", "Survival", "Security", "Stability", "Accumulation", "Independence", "Freedom", "Abundance",
    ]  # fmt: skip
    assert stages[0].lo == 300 and stages[-1].hi == 900
    for a, b in zip(stages, stages[1:], strict=False):
        assert b.lo == a.hi + 1
    for s in range(300, 901):
        assert band_stage(D(s), stages).lo <= s <= band_stage(D(s), stages).hi


def test_stage_is_provisional_until_matrix_approved() -> None:
    r = resolve_stage(D(665), 35, RB.stages(), RB.stage_matrix())
    assert r.stage == "Accumulation" and r.provisional is True  # deck slide 4 example: 665 = Accumulation


def test_score_within_bounds_and_deterministic() -> None:
    a, b = compute_score(SPEC, FULL), compute_score(SPEC, FULL)
    assert a == b
    assert a.overall is not None and D(300) <= a.overall <= D(900)


def test_missing_data_lowers_confidence_not_score_to_zero() -> None:
    full = compute_score(SPEC, FULL)
    partial = compute_score(SPEC, {"savings_rate": D("0.2")})
    assert partial.overall is not None and partial.overall > D(300)
    assert partial.confidence < full.confidence < D(1)  # most pillars have no calculator yet
    assert "emergency_months" in partial.missing_inputs


def test_no_data_gives_no_score() -> None:
    r = compute_score(SPEC, {})
    assert r.overall is None and r.confidence == 0


@settings(max_examples=100, deadline=None)
@given(sr=st.integers(-50, 80), em=st.integers(0, 40), dti=st.integers(0, 90), t=st.booleans(), h=st.booleans())
def test_additivity_and_bounds_for_any_inputs(sr: int, em: int, dti: int, t: bool, h: bool) -> None:
    inputs = {
        "savings_rate": D(sr) / 100, "emergency_months": D(em), "debt_to_income": D(dti) / 100,
        "has_term_insurance": t, "has_health_insurance": h,
    }  # fmt: skip
    r = compute_score(SPEC, inputs)
    assert r.overall is not None
    assert D(300) <= r.overall <= D(900)
    assert abs(r.reference + sum(p.contribution for p in r.pillars) - r.overall) < Decimal("1e-20")
    assert abs(sum(p.effective_weight for p in r.pillars) - 1) < Decimal("1e-20")
    for p in r.pillars:
        assert p.score is None or D(0) <= p.score <= D(100)


@settings(max_examples=60, deadline=None)
@given(a=st.integers(0, 60), b=st.integers(0, 60))
def test_higher_savings_rate_never_lowers_score(a: int, b: int) -> None:
    lo, hi = sorted((a, b))
    s_lo = compute_score(SPEC, {**FULL, "savings_rate": D(lo) / 100}).overall
    s_hi = compute_score(SPEC, {**FULL, "savings_rate": D(hi) / 100}).overall
    assert s_lo is not None and s_hi is not None and s_hi >= s_lo


def test_lower_debt_never_lowers_score() -> None:
    hi_debt = compute_score(SPEC, {**FULL, "debt_to_income": D("0.6")}).overall
    lo_debt = compute_score(SPEC, {**FULL, "debt_to_income": D("0.1")}).overall
    assert hi_debt is not None and lo_debt is not None and lo_debt > hi_debt


def test_score_unchanged_by_non_financial_inputs() -> None:
    """Chat volume or any unrelated key must not move the score (blueprint section 6, score movement rule)."""
    base = compute_score(SPEC, FULL)
    noisy = compute_score(SPEC, {**FULL, "messages_sent": D(999), "chat_minutes": D(120)})
    assert base == noisy


def test_traits_and_persona() -> None:
    specs = {t.key: t for t in RB.trait_specs()}
    conf = RB.trait_confidence()
    t1 = evaluate_trait(specs["savings_identity"], {"savings_rate": D("0.4")}, conf)
    t2 = evaluate_trait(specs["debt_behaviour"], {"debt_to_income": D("0.2")}, conf)
    assert t1 and t1.value == "Saver" and t2 and t2.value == "Controlled"
    assert evaluate_trait(specs["savings_identity"], {}, conf) is None  # no evidence => no trait
    p = pick_persona(RB.personas(), {"savings_identity": "Saver", "debt_behaviour": "Controlled"})
    assert p is not None and "demo" in p.name
    assert pick_persona(RB.personas(), {}) is None  # never guessed
