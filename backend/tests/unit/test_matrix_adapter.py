from decimal import Decimal

import pytest

from app.domains.scoring.matrix_adapter import catalogue_key, liquid_counted_as_debt, to_matrix_inputs
from app.engines.money import D
from app.infra.errors import AppError

CORE = {"age": D(35), "annual_income": D(1_200_000)}


def test_maps_stated_facts_and_converts_annual_income_to_monthly() -> None:
    x = to_matrix_inputs(
        {
            "age": D(35),
            "annual_income": D(2_400_000),
            "monthly_expenses": D(80_000),
            "monthly_emi_total": D(0),
            "monthly_investment": D(25_000),
            "dependants": D(2),
            "retirement_age": D(58),
        }  # fmt: skip
    )
    assert x.age == 35 and x.monthly_income == D(200_000)
    assert (x.monthly_expenses, x.total_emi, x.monthly_investments) == (D(80_000), D(0), D(25_000))
    assert x.dependants == 2 and x.retirement_age == 58


def test_maps_the_workbook_fields() -> None:
    x = to_matrix_inputs(
        {
            **CORE,
            "loans_outstanding": D(2_000_000),
            "equity_holdings": D(1_500_000),
            "debt_holdings": D(700_000),
            "other_assets": D(3_000_000),
            "pending_goals": D(2),
            "life_cover_amount": D(10_000_000),
            "health_cover_amount": D(1_000_000),
            "kids": D(1),
            "kids_goal_planned": True,
            "section_80c": D(150_000),
            "section_80d": D(25_000),
            "life_expectancy": D(85),
        },  # fmt: skip
        choices={"risk_profile": "moderately aggressive"},
    )
    assert (x.loans_outstanding, x.equity, x.debt, x.other_assets) == (D(2_000_000), D(1_500_000), D(700_000), D(3_000_000))
    assert (x.pending_goals, x.life_cover, x.health_cover, x.kids, x.kids_goal_planned) == (
        2,
        D(10_000_000),
        D(1_000_000),
        1,
        True,
    )
    assert (x.section_80c, x.section_80d, x.life_expectancy) == (D(150_000), D(25_000), 85)
    assert x.risk_profile == "MODERATELY AGGRESSIVE"  # the catalogue stores lower case; the engine uses the profile name


def test_kids_goal_planned_false_is_kept_not_dropped() -> None:
    assert to_matrix_inputs({**CORE, "kids_goal_planned": False}).kids_goal_planned is False


def test_liquid_savings_join_debt_investments_only_when_debt_is_stated() -> None:
    both = {**CORE, "debt_holdings": D(700_000), "liquid_assets": D(300_000)}
    assert to_matrix_inputs(both).debt == D(1_000_000) and liquid_counted_as_debt(both)
    only_debt = {**CORE, "debt_holdings": D(700_000)}
    assert to_matrix_inputs(only_debt).debt == D(700_000) and not liquid_counted_as_debt(only_debt)
    only_liquid = {**CORE, "liquid_assets": D(300_000)}
    assert to_matrix_inputs(only_liquid).debt is None and not liquid_counted_as_debt(only_liquid)  # never guess the rest


def test_never_guesses_facts_the_user_has_not_stated() -> None:
    x = to_matrix_inputs({**CORE, "has_term_insurance": True, "has_health_insurance": True, "liquid_assets": D(500_000)})
    # insurance yes/no is not a cover amount, liquid savings alone are not "debt", and no goals recorded is not "0 pending goals"
    for name in ("monthly_expenses", "total_emi", "monthly_investments", "life_cover", "health_cover", "equity", "debt", "other_assets",
                 "pending_goals", "loans_outstanding", "kids", "kids_goal_planned", "section_80c", "section_80d", "life_expectancy",
                 "risk_profile"):  # fmt: skip
        assert getattr(x, name) is None, name


@pytest.mark.parametrize(
    "raw",
    [
        {},
        {"age": D(30)},
        {"annual_income": D(100)},
        {"age": D(30), "annual_income": D(0)},
        {"age": None, "annual_income": D(5)},
        {"age": True, "annual_income": D(5)},
    ],
)
def test_age_and_income_are_required(raw: dict[str, Decimal | bool | None]) -> None:
    with pytest.raises(AppError) as e:
        to_matrix_inputs(raw)
    assert e.value.status == 422 and e.value.code == "insufficient_data"


def test_catalogue_key_translation_for_the_ui() -> None:
    assert catalogue_key("life_cover") == "life_cover_amount"
    assert catalogue_key("total_emi") == "monthly_emi_total"
    assert catalogue_key("equity") == "equity_holdings"
    assert catalogue_key("something_else") == "something_else"
