"""Canonical field catalogue: the typed vocabulary of the Financial State Model (blueprint section 5).
Facts are only accepted for keys defined here. Adding a field = adding it here (plus migration-free, it is data)."""

from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from typing import Any, Literal

Kind = Literal["money", "bool", "int", "choice"]

SOURCE_TYPES = ("USER_STATED", "CONNECTED", "DERIVED", "INFERRED", "ESTIMATED")
# Higher rank may supersede lower rank without explicit user action.
SOURCE_RANK = {"CONNECTED": 3, "USER_STATED": 3, "DERIVED": 2, "ESTIMATED": 1, "INFERRED": 1}


@dataclass(frozen=True)
class FieldDef:
    key: str
    label: str
    kind: Kind
    question: str  # why-we-ask question used by the interview selector
    why: str
    unit: str | None = None
    choices: tuple[str, ...] = ()
    min: int | None = None
    max: int | None = None


FIELDS: dict[str, FieldDef] = {f.key: f for f in [
    FieldDef("age", "Age", "int", "How old are you?", "Your age sets your time horizon for every goal.", "years", min=18, max=100),
    FieldDef("annual_income", "Household annual income", "money",
             "Roughly what is your total household income per year (before tax)?",
             "Income is the base for savings capacity and debt comfort.", "INR/year"),
    FieldDef("monthly_expenses", "Monthly expenses", "money",
             "About how much does your household spend in a typical month?",
             "To answer properly I need to understand your monthly surplus.", "INR/month"),
    FieldDef("liquid_assets", "Liquid savings", "money",
             "How much do you hold in savings accounts, liquid funds or FDs that you could use within days?",
             "This tells me how many months you could manage in an emergency.", "INR"),
    FieldDef("monthly_emi_total", "Total monthly EMIs", "money",
             "What is the total you pay every month towards loan EMIs (home, car, personal)? Enter 0 if none.",
             "Loan payments determine how much of your income is already committed.", "INR/month"),
    FieldDef("has_term_insurance", "Term life insurance", "bool", "Do you have term life insurance?",
             "Protection for dependants is part of financial resilience."),
    FieldDef("has_health_insurance", "Health insurance", "bool", "Do you have health insurance (beyond any employer cover)?",
             "A medical event is one of the biggest threats to savings."),
    FieldDef("dependants", "Dependants", "int", "How many people depend on your income?",
             "Dependants change how much protection and buffer you need.", "people", min=0, max=20),
    FieldDef("home_ownership", "Home", "choice", "Do you own your home or rent?", "Housing is usually the largest commitment.",
             choices=("own", "rent", "family")),
    FieldDef("retirement_age", "Target retirement age", "int", "At what age would you like to retire?",
             "Needed before I can say whether you are on track for retirement.", "years", min=30, max=90),
    FieldDef("monthly_investment", "Monthly investments", "money", "How much do you invest (SIPs etc.) each month?",
             "Regular investing is the engine of long-term wealth.", "INR/month"),
]}  # fmt: skip

# Fields the interview asks about, in default priority order (the selector reorders by relevance/coverage).
INTERVIEW_ORDER = (
    "annual_income", "monthly_expenses", "liquid_assets", "monthly_emi_total", "has_health_insurance",
    "has_term_insurance", "age", "dependants", "home_ownership", "retirement_age", "monthly_investment",
)  # fmt: skip


class InvalidFact(ValueError):
    pass


def normalise_value(field: FieldDef, raw: Any) -> str:
    """Validate and canonicalise to a string stored in JSON: money => plain decimal, bool => 'true'/'false'."""
    if field.kind == "money":
        try:
            d = Decimal(str(raw).replace(",", ""))
        except (InvalidOperation, ValueError) as e:
            raise InvalidFact(f"{field.key}: not a valid amount") from e
        if not d.is_finite() or d < 0 or d > Decimal("1e12"):
            raise InvalidFact(f"{field.key}: amount out of range")
        return format(d.quantize(Decimal("0.01")), "f")
    if field.kind == "bool":
        if isinstance(raw, bool):
            return "true" if raw else "false"
        s = str(raw).strip().lower()
        if s in ("true", "yes", "y", "1"):
            return "true"
        if s in ("false", "no", "n", "0"):
            return "false"
        raise InvalidFact(f"{field.key}: expected yes/no")
    if field.kind == "int":
        try:
            n = int(str(raw).strip())
        except ValueError as e:
            raise InvalidFact(f"{field.key}: expected a whole number") from e
        if (field.min is not None and n < field.min) or (field.max is not None and n > field.max):
            raise InvalidFact(f"{field.key}: must be between {field.min} and {field.max}")
        return str(n)
    s = str(raw).strip().lower()
    if s not in field.choices:
        raise InvalidFact(f"{field.key}: must be one of {', '.join(field.choices)}")
    return s
