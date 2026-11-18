"""The profile catalogue fields that feed the workbook-based FinScore, and the interview behaviour around them."""

from decimal import Decimal

import pytest

from app.ai.extraction import rule_extract
from app.domains.interview.service import INTENT_BOOST, select_next_field
from app.domains.profile.catalog import FIELDS, INTERVIEW_ORDER, InvalidFact, normalise_value
from app.domains.scoring.matrix_adapter import INPUT_SOURCES
from app.engines.matrix_score import MatrixInputs
from app.rulebook.matrix_rules import load_matrix_spec

ORIGINAL_11 = (
    "annual_income", "monthly_expenses", "liquid_assets", "monthly_emi_total", "has_health_insurance",
    "has_term_insurance", "age", "dependants", "home_ownership", "retirement_age", "monthly_investment",
)  # fmt: skip
NEW_13 = tuple(k for k in INTERVIEW_ORDER if k not in ORIGINAL_11)


def vals(text: str, awaiting: str) -> dict[str, str]:
    return {c.field_key: c.value for c in rule_extract(text, awaiting)}


def test_every_engine_input_has_a_catalogue_field() -> None:
    engine_inputs = set(MatrixInputs.__dataclass_fields__)
    assert engine_inputs == set(INPUT_SOURCES), "INPUT_SOURCES must list every engine input exactly once"
    assert set(INPUT_SOURCES.values()) <= set(FIELDS)


def test_original_interview_order_is_unchanged_and_new_fields_come_after() -> None:
    # home_ownership is no longer asked (neither score uses it, 2026-11-18); the rest keep their order
    assert INTERVIEW_ORDER[:10] == tuple(k for k in ORIGINAL_11 if k != "home_ownership")
    assert len(NEW_13) == 13 and set(INTERVIEW_ORDER) == set(FIELDS) - {"home_ownership"}


def test_selector_asks_new_fields_only_after_the_original_ones() -> None:
    known = set(ORIGINAL_11)
    assert select_next_field(known, set(), []) == "loans_outstanding"
    assert select_next_field(known | set(NEW_13), set(), []) is None
    assert select_next_field(set(), set(), []) == "annual_income"  # unchanged first question
    assert select_next_field(set(), set(), ["retirement"]) == "age"  # unchanged boost


def test_intent_boosts_only_reference_real_fields() -> None:
    assert all(k in FIELDS for keys in INTENT_BOOST.values() for k in keys)


def test_every_new_field_has_a_question_and_a_reason() -> None:
    for k in NEW_13:
        f = FIELDS[k]
        assert f.question.endswith(("?", ".", ")")) and len(f.why) > 20, k


@pytest.mark.parametrize(
    ("key", "answer", "expected"),
    [
        ("loans_outstanding", "45 lakh", "4500000.00"),
        ("loans_outstanding", "none", "0.00"),
        ("equity_holdings", "12 lakh", "1200000.00"),
        ("debt_holdings", "2.5 lakh", "250000.00"),
        ("other_assets", "1 crore", "10000000.00"),
        ("life_cover_amount", "1 crore", "10000000.00"),
        ("health_cover_amount", "10 lakh", "1000000.00"),
        ("section_80c", "1.5 lakh", "150000.00"),
        ("section_80d", "25k", "25000.00"),
        ("pending_goals", "3", "3"),
        ("kids", "2", "2"),
        ("life_expectancy", "85", "85"),
        ("kids_goal_planned", "no", "false"),
        ("kids_goal_planned", "yes", "true"),
        ("risk_profile", "balanced", "balanced"),
        ("risk_profile", "moderately aggressive", "moderately aggressive"),  # not mistaken for 'aggressive'
        ("risk_profile", "moderately conservative", "moderately conservative"),
        ("risk_profile", "conservative", "conservative"),
    ],
)
def test_short_answers_are_understood_for_the_new_fields(key: str, answer: str, expected: str) -> None:
    assert vals(answer, key)[key] == expected


def test_annual_and_total_amounts_are_not_treated_as_monthly() -> None:
    # 80C/80D are yearly and holdings are totals: "per month" conversion applies only to the monthly fields
    assert Decimal(vals("1.5 lakh", "section_80c")["section_80c"]) == Decimal(150_000)
    assert Decimal(vals("5 lakh", "equity_holdings")["equity_holdings"]) == Decimal(500_000)


@pytest.mark.parametrize(
    ("key", "bad"),
    [("kids", "-1"), ("kids", "99"), ("pending_goals", "50"), ("life_expectancy", "20"), ("life_expectancy", "200"),
     ("risk_profile", "reckless"), ("loans_outstanding", "-5"), ("section_80c", "abc"), ("kids_goal_planned", "maybe")],
)  # fmt: skip
def test_invalid_values_are_rejected(key: str, bad: str) -> None:
    with pytest.raises(InvalidFact):
        normalise_value(FIELDS[key], bad)


def test_every_risk_profile_choice_is_a_profile_the_engine_knows() -> None:
    spec = load_matrix_spec()
    assert {c.upper() for c in FIELDS["risk_profile"].choices} == set(spec.risk.annual_return)
