from decimal import Decimal

from app.engines.money import Calc, D, round_money

EMI_ASSUMPTIONS = ("Equated monthly instalments paid at month end", "Interest compounds monthly at annual rate / 12")


def emi(principal: Decimal, annual_rate_pct: Decimal, months: int) -> Calc:
    """Standard reducing-balance EMI: P*r*(1+r)^n / ((1+r)^n - 1). Zero rate => P / n."""
    if months <= 0:
        raise ValueError("months must be positive")
    p, rate = D(principal), D(annual_rate_pct)
    if p < 0 or rate < 0:
        raise ValueError("principal and rate must be non-negative")
    if rate == 0:
        return Calc(round_money(p / months), EMI_ASSUMPTIONS)
    r = rate / Decimal(1200)
    f = (1 + r) ** months
    return Calc(round_money(p * r * f / (f - 1)), EMI_ASSUMPTIONS)


def debt_to_income(monthly_emi_total: Decimal, monthly_income: Decimal) -> Decimal | None:
    """Total monthly EMI / monthly income, as a ratio. None when income is not positive."""
    income = D(monthly_income)
    if income <= 0:
        return None
    return D(monthly_emi_total) / income
