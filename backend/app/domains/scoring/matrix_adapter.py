"""Maps the user's stated profile facts onto the inputs of the workbook-based FinScore (`app.engines.matrix_score`).

Rule: never guess. A fact the user has not stated stays None, so the engine excludes that factor and lowers confidence.
In particular "no goals recorded" is NOT treated as "0 pending goals", and a yes/no insurance flag is NOT turned into a cover
amount. `INPUT_SOURCES` is the single table tying each engine input to its profile-catalogue field.
"""

from collections.abc import Mapping
from decimal import Decimal

from app.engines.matrix_score import MatrixInputs
from app.engines.money import D
from app.infra.errors import AppError

Raw = Mapping[str, Decimal | bool | None]

# engine input -> profile catalogue field (age and income are special: see to_matrix_inputs)
INPUT_SOURCES: dict[str, str] = {
    "age": "age",
    "monthly_income": "annual_income",  # catalogue stores yearly income; the engine wants monthly
    "monthly_expenses": "monthly_expenses",
    "total_emi": "monthly_emi_total",
    "loans_outstanding": "loans_outstanding",
    "equity": "equity_holdings",
    "debt": "debt_holdings",  # plus liquid_assets when stated, see liquid_counted_as_debt
    "other_assets": "other_assets",
    "monthly_investments": "monthly_investment",
    "pending_goals": "pending_goals",
    "life_cover": "life_cover_amount",
    "health_cover": "health_cover_amount",
    "dependants": "dependants",
    "kids": "kids",
    "kids_goal_planned": "kids_goal_planned",
    "section_80c": "section_80c",
    "section_80d": "section_80d",
    "retirement_age": "retirement_age",
    "life_expectancy": "life_expectancy",
    "risk_profile": "risk_profile",
}


def catalogue_key(engine_input: str) -> str:
    """Profile field to ask the user about when the engine reports `engine_input` as missing."""
    return INPUT_SOURCES.get(engine_input, engine_input)


def _money(raw: Raw, key: str) -> Decimal | None:
    v = raw.get(key)
    return v if isinstance(v, Decimal) else None


def _int(raw: Raw, key: str) -> int | None:
    v = raw.get(key)
    return int(v) if isinstance(v, Decimal) else None


def _bool(raw: Raw, key: str) -> bool | None:
    v = raw.get(key)
    return v if isinstance(v, bool) else None


def liquid_counted_as_debt(raw: Raw) -> bool:
    """Liquid savings (savings accounts, liquid funds, FDs) are debt-type holdings. They are added to the stated debt
    investments so total assets and the equity share are not understated; only when debt investments are stated."""
    return _money(raw, "debt_holdings") is not None and _money(raw, "liquid_assets") is not None


def to_matrix_inputs(raw: Raw, *, choices: Mapping[str, str] | None = None) -> MatrixInputs:
    """`raw` is ProfileService.raw_inputs(); `choices` holds choice-type facts (e.g. risk_profile), which raw_inputs does not expose.
    Raises AppError(422) when age or income is missing: the matrices cannot be read without them."""
    age = _int(raw, "age")
    annual_income = _money(raw, "annual_income")
    if age is None or annual_income is None or annual_income <= 0:
        raise AppError(
            422, "insufficient_data", "Not enough information to compute a score yet", "Tell me your age and your yearly income."
        )
    debt = _money(raw, "debt_holdings")
    if debt is not None and liquid_counted_as_debt(raw):
        debt = debt + (_money(raw, "liquid_assets") or D(0))
    risk = (choices or {}).get("risk_profile")
    return MatrixInputs(
        age=age,
        monthly_income=annual_income / D(12),
        monthly_expenses=_money(raw, "monthly_expenses"),
        total_emi=_money(raw, "monthly_emi_total"),
        loans_outstanding=_money(raw, "loans_outstanding"),
        equity=_money(raw, "equity_holdings"),
        debt=debt,
        other_assets=_money(raw, "other_assets"),
        monthly_investments=_money(raw, "monthly_investment"),
        pending_goals=_int(raw, "pending_goals"),
        life_cover=_money(raw, "life_cover_amount"),
        health_cover=_money(raw, "health_cover_amount"),
        dependants=_int(raw, "dependants"),
        kids=_int(raw, "kids"),
        kids_goal_planned=_bool(raw, "kids_goal_planned"),
        section_80c=_money(raw, "section_80c"),
        section_80d=_money(raw, "section_80d"),
        retirement_age=_int(raw, "retirement_age"),
        life_expectancy=_int(raw, "life_expectancy"),
        risk_profile=risk.upper() if risk else None,
    )
