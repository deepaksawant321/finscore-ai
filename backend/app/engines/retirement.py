from dataclasses import dataclass
from decimal import Decimal

from app.engines.money import D, round_money


@dataclass(frozen=True)
class RetirementResult:
    required_corpus: Decimal
    inflated_monthly_expense_at_retirement: Decimal
    assumptions: tuple[str, ...]


def required_corpus(
    monthly_expense_today: Decimal,
    inflation_pct: Decimal,
    years_to_retirement: int,
    retirement_years: int,
    post_retirement_return_pct: Decimal,
) -> RetirementResult:
    """Corpus needed at retirement to fund inflation-adjusted expenses for `retirement_years`.

    Method: expenses at retirement = today's * (1+i)^years; corpus = present value (at retirement, annual
    compounding on the REAL return) of an annuity-due of the first-year expense. Default rates are NOT supplied by
    the engine: callers must pass approved/explicit assumptions (Rulebook D-B7 is PENDING).
    """
    if years_to_retirement < 0 or retirement_years <= 0:
        raise ValueError("invalid horizon")
    exp_at_ret_monthly = D(monthly_expense_today) * (1 + D(inflation_pct) / 100) ** years_to_retirement  # unrounded
    annual = exp_at_ret_monthly * 12
    i, g = D(inflation_pct) / 100, D(post_retirement_return_pct) / 100
    real = (1 + g) / (1 + i) - 1
    if real == 0:
        corpus = annual * retirement_years
    else:
        corpus = annual * (1 - (1 + real) ** -retirement_years) / real * (1 + real)
    return RetirementResult(
        round_money(corpus),
        round_money(exp_at_ret_monthly),
        (
            "Expenses grow with inflation until retirement and during retirement",
            "Withdrawals made at the start of each year (annuity-due) on the real return",
            "Inflation and post-retirement return are assumptions, not guarantees",
            "Excludes taxes, one-off expenses and other income (pension, rent)",
        ),
    )


def corpus_gap(required: Decimal, projected: Decimal) -> Decimal:
    """Positive = shortfall, negative = surplus."""
    return D(required) - D(projected)
