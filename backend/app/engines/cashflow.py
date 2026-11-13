from decimal import Decimal

from app.engines.money import D


def monthly_surplus(monthly_income: Decimal, monthly_expenses: Decimal) -> Decimal:
    return D(monthly_income) - D(monthly_expenses)


def savings_rate(monthly_income: Decimal, monthly_expenses: Decimal) -> Decimal | None:
    """(income - expenses) / income, as a ratio. None when income is not positive."""
    income = D(monthly_income)
    if income <= 0:
        return None
    return (income - D(monthly_expenses)) / income


def emergency_months(liquid_assets: Decimal, monthly_essential_expenses: Decimal) -> Decimal | None:
    """Months of essential expenses covered by liquid assets. None when expenses are not positive."""
    exp = D(monthly_essential_expenses)
    if exp <= 0:
        return None
    return D(liquid_assets) / exp
