"""Deterministic time-value-of-money and workbook-style calculators (retirement, life cover, goals).

Pure: no I/O, no clock, no randomness. Decimal only. Every rate/assumption is an explicit argument: this module
holds NO business constants (inflation, annuity rate, return rates come from the rule set; see docs/rules).

Conventions copied from the business workbooks ("Retirement new1.xlsm", "MasterSheet of FinScore.xlsx"):
monthly compounding via (1+annual)^(1/12)-1, and all annuities are annuity-due (payments at the start of the period,
Excel `type=1`). Results are unrounded here; round at the presentation edge with `round_money`.
"""

from dataclasses import dataclass
from decimal import Decimal

from app.engines.money import D

_ONE = D(1)
_TWELVE = D(12)


def monthly_rate(annual: Decimal) -> Decimal:
    """Effective monthly rate equivalent to an effective annual rate."""
    return (_ONE + annual) ** (_ONE / _TWELVE) - _ONE


def compound(amount: Decimal, rate: Decimal, periods: Decimal) -> Decimal:
    """FV of a lump sum: amount * (1+rate)^periods."""
    return amount * (_ONE + rate) ** periods


def pv_annuity_due(rate: Decimal, periods: int, payment: Decimal) -> Decimal:
    """Present value of `payment` paid at the start of each of `periods` periods (Excel PV(...,type=1))."""
    if periods < 0:
        raise ValueError("periods must be >= 0")
    if rate == 0:
        return payment * periods
    return payment * (_ONE - (_ONE + rate) ** -periods) / rate * (_ONE + rate)


def payment_for_future_value(rate: Decimal, periods: int, future_value: Decimal) -> Decimal:
    """Level start-of-period payment that accumulates to `future_value` (Excel PMT(...,0,-fv,1))."""
    if periods <= 0:
        raise ValueError("periods must be > 0")
    if rate == 0:
        return future_value / periods
    return future_value * rate / ((_ONE + rate) ** periods - _ONE) / (_ONE + rate)


@dataclass(frozen=True)
class RetirementPlan:
    expense_at_retirement_monthly: Decimal
    corpus_required: Decimal  # includes the inflated medical corpus
    monthly_sip: Decimal  # level monthly SIP to fund `corpus_required` (workbook G22)
    annual_sip: Decimal  # level annual investment (workbook G23)
    one_time: Decimal  # lump sum today (workbook G24)
    corpus_after_savings: Decimal  # corpus still to be funded after existing savings / tagged investments (>= 0)
    monthly_sip_after_savings: Decimal
    assumptions: tuple[str, ...]


def retirement_plan(
    *,
    monthly_expense: Decimal,
    age: int,
    retirement_age: int,
    life_expectancy: int,
    inflation: Decimal,
    annuity_rate: Decimal,
    profile_annual_return: Decimal,
    medical_corpus: Decimal = Decimal(0),
    current_savings: Decimal = Decimal(0),
    tagged_investments_future_value: Decimal = Decimal(0),
) -> RetirementPlan:
    """Retirement corpus and the SIP needed, following the workbook (Goals sheet, steps 1-4).

    1. Monthly expense is inflated (monthly compounding) to the first retirement month.
    2. Corpus = PV of that expense, paid monthly for the retired months, discounted at the REAL monthly rate
       ((1+annuity_rate)/(1+inflation))^(1/12)-1; plus the medical corpus inflated to retirement.
    3. SIP = level monthly payment, compounding at the risk-profile return, that reaches the corpus.
    4. Existing savings (compounded at the profile rate) and tagged investments reduce the corpus still to fund.
    The workbook's SIP (G22) is computed on the corpus BEFORE step 4; both are returned.
    """
    if retirement_age <= age:
        raise ValueError("retirement_age must be greater than age")
    if life_expectancy <= retirement_age:
        raise ValueError("life_expectancy must be greater than retirement_age")
    if monthly_expense < 0:
        raise ValueError("monthly_expense must be >= 0")
    n_accum = (retirement_age - age) * 12
    n_retired = (life_expectancy - retirement_age) * 12
    im = monthly_rate(inflation)
    expense_ret = monthly_expense * (_ONE + im) ** n_accum
    real_monthly = ((_ONE + annuity_rate) / (_ONE + inflation)) ** (_ONE / _TWELVE) - _ONE
    corpus = pv_annuity_due(real_monthly, n_retired, expense_ret) + medical_corpus * (_ONE + im) ** n_accum
    pm = monthly_rate(profile_annual_return)
    years = Decimal(n_accum) / _TWELVE
    savings_fv = current_savings * (_ONE + pm) ** n_accum
    net = max(corpus - savings_fv - tagged_investments_future_value, D(0))
    return RetirementPlan(
        expense_at_retirement_monthly=expense_ret,
        corpus_required=corpus,
        monthly_sip=payment_for_future_value(pm, n_accum, corpus),
        annual_sip=_annual(profile_annual_return, years, corpus),
        one_time=corpus / (_ONE + profile_annual_return) ** years,
        corpus_after_savings=net,
        monthly_sip_after_savings=payment_for_future_value(pm, n_accum, net) if net > 0 else D(0),
        assumptions=(
            "Expenses inflate monthly until retirement; withdrawals are monthly, at the start of each month",
            "Corpus is discounted at the real return implied by the annuity rate and inflation",
            "SIP compounds monthly at the selected risk-profile return; returns are assumptions, not guarantees",
            "Excludes tax, one-off expenses and other income (pension, rent)",
        ),
    )


def _annual(rate: Decimal, years: Decimal, fv: Decimal) -> Decimal:
    """Annual payment for non-integer horizons (workbook allows years + months/12 in PMT nper)."""
    if rate == 0:
        return fv / years
    return fv * rate / ((_ONE + rate) ** years - _ONE) / (_ONE + rate)


def human_life_value(
    *, annual_expenses: Decimal, years_to_retirement: int, discount_rate: Decimal, existing_cover: Decimal
) -> tuple[Decimal, Decimal]:
    """(recommended cover, gap). Recommended = PV of annual expenses until retirement (workbook 'HLV')."""
    need = pv_annuity_due(discount_rate, years_to_retirement, annual_expenses)
    return need, max(need - existing_cover, D(0))


@dataclass(frozen=True)
class GoalPlan:
    future_value: Decimal
    monthly_saving: Decimal
    annual_saving: Decimal
    one_time: Decimal


def goal_plan(*, amount_today: Decimal, years: int, inflation: Decimal, annual_return: Decimal) -> GoalPlan:
    """Inflate a goal to its date and compute the SIP / annual / lump-sum needed at `annual_return` (workbook FutureValueCalculator)."""
    if years <= 0:
        raise ValueError("years must be > 0")
    fv = amount_today * (_ONE + inflation) ** years
    return GoalPlan(
        future_value=fv,
        monthly_saving=payment_for_future_value(monthly_rate(annual_return), years * 12, fv),
        annual_saving=payment_for_future_value(annual_return, years, fv),
        one_time=fv / (_ONE + annual_return) ** years,
    )
