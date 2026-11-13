from datetime import date
from decimal import Decimal

import pytest

from app.domains.goals.models import Goal
from app.domains.goals.service import funding_view, months_between
from app.domains.governance.advice import asks_for_regulated_advice, classify_output, indicates_distress
from app.engines import growth
from app.engines.money import D


# ---------------- advice classification ----------------
@pytest.mark.parametrize(
    "text",
    [
        "Which stock should I buy for 2x returns?",
        "Should I buy Reliance now?",
        "Give me guaranteed returns options",
        "what is the best mutual fund to invest in",
        "any sure-shot profit tips?",
        "Best SIP to start today?",
    ],
)
def test_regulated_requests_detected(text: str) -> None:
    assert asks_for_regulated_advice(text)


@pytest.mark.parametrize(
    "text",
    [
        "I earn 22 lakh a year",
        "How much SIP do I need for a 50 lakh goal?",
        "Do I have enough emergency fund?",
        "What is a mutual fund?",
    ],
)
def test_ordinary_questions_not_flagged(text: str) -> None:
    assert not asks_for_regulated_advice(text)


def test_output_classification() -> None:
    assert classify_output("You should buy shares of ACME for guaranteed returns") == "regulated"
    assert classify_output("Guaranteed returns of 12% are possible") == "regulated"
    assert classify_output("I recommend increasing your SIP") == "recommendation"
    assert classify_output("Your projected corpus has a shortfall") == "planning"
    assert classify_output("What is a term plan? It means pure life cover.") == "education"
    assert classify_output("Thanks, I have noted that.") == "information"


def test_distress_detection() -> None:
    assert indicates_distress("I can't go on with these debts, I want to die")
    assert not indicates_distress("my loan EMI is high")


# ---------------- goals funding (deterministic, explicit assumptions) ----------------
TODAY = date(2026, 1, 15)


def goal(amount: str, target: date, current: str = "0", monthly: str = "0") -> Goal:
    return Goal(name="g", target_amount_today=D(amount), target_date=target, priority="important",
                current_funding=D(current), monthly_funding=D(monthly))  # fmt: skip


def test_months_between() -> None:
    assert months_between(date(2026, 1, 15), date(2036, 1, 15)) == 120
    assert months_between(date(2026, 1, 15), date(2036, 1, 14)) == 119
    assert months_between(date(2026, 1, 15), date(2025, 1, 1)) == 0


def test_funding_golden_zero_inflation() -> None:
    v = funding_view(goal("1000000", date(2036, 1, 15), monthly="10000"), D(12), D(0), TODAY)
    assert v.months_remaining == 120 and v.future_target == Decimal("1000000.00")
    assert v.projected_total == Decimal("2300386.89")  # same golden value as the SIP engine test
    assert v.shortfall < 0 and v.required_monthly_additional == 0 and v.funded_ratio > 1


def test_funding_inflates_target_to_target_date() -> None:
    v = funding_view(goal("1000000", date(2036, 1, 15)), D(10), D(6), TODAY)
    assert v.future_target == Decimal("1790847.70")  # 1,000,000 * 1.06^10
    assert v.projected_total == 0 and v.shortfall == v.future_target


def test_required_additional_closes_the_gap() -> None:
    v = funding_view(goal("5000000", date(2041, 1, 15), current="200000", monthly="5000"), D(10), D(6), TODAY)
    assert v.shortfall > 0 and v.required_monthly_additional > 0
    closes = growth.fv_sip(v.required_monthly_additional, D(10), v.months_remaining).value
    assert abs(closes - v.shortfall) <= Decimal("5")  # rounding of the monthly amount to paise


def test_funding_carries_user_chosen_assumptions_and_no_hidden_defaults() -> None:
    v = funding_view(goal("100000", date(2030, 1, 15)), D(8), D(5), TODAY)
    text = " ".join(v.assumptions)
    assert "8%" in text and "5%" in text and "not a guarantee" in text.lower()
