from decimal import Decimal

from app.engines.money import Calc, D, round_money

_COMPOUNDING = "Returns compound monthly at annual rate / 12 (nominal)"
_NOT_GUARANTEED = "Return is an assumption, not a guarantee"


def _monthly(rate_pct: Decimal) -> Decimal:
    return D(rate_pct) / Decimal(1200)


def fv_lumpsum(amount: Decimal, annual_rate_pct: Decimal, months: int) -> Calc:
    if months < 0:
        raise ValueError("months must be non-negative")
    return Calc(round_money(D(amount) * (1 + _monthly(annual_rate_pct)) ** months), (_COMPOUNDING, _NOT_GUARANTEED))


def fv_sip(monthly_amount: Decimal, annual_rate_pct: Decimal, months: int) -> Calc:
    """Future value of equal monthly investments made at the END of each month (ordinary annuity)."""
    if months < 0:
        raise ValueError("months must be non-negative")
    r, a = _monthly(annual_rate_pct), D(monthly_amount)
    value = a * months if r == 0 else a * (((1 + r) ** months - 1) / r)
    return Calc(round_money(value), ("Contributions made at month end", _COMPOUNDING, _NOT_GUARANTEED))


def required_sip(target: Decimal, annual_rate_pct: Decimal, months: int) -> Calc:
    """Monthly amount whose end-of-month FV after `months` equals `target` (inverse of fv_sip)."""
    if months <= 0:
        raise ValueError("months must be positive")
    r, t = _monthly(annual_rate_pct), D(target)
    value = t / months if r == 0 else t * r / ((1 + r) ** months - 1)
    return Calc(round_money(value), ("Contributions made at month end", _COMPOUNDING, _NOT_GUARANTEED))


def inflate(amount_today: Decimal, annual_inflation_pct: Decimal, years: int) -> Calc:
    """Value of today's amount after `years` of annual inflation."""
    if years < 0:
        raise ValueError("years must be non-negative")
    value = D(amount_today) * (1 + D(annual_inflation_pct) / 100) ** years
    return Calc(round_money(value), ("Inflation compounds annually", "Inflation is an assumption"))
