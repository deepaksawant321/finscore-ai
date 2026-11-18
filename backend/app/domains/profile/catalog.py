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
    # --- inputs of the workbook-based FinScore (app/engines/matrix_score.py). Added after the original 11 so interview order is unchanged.
    FieldDef("loans_outstanding", "Total loans outstanding", "money",
             "What is the total amount you still owe on all loans (home, car, personal, credit cards)? Enter 0 if none.",
             "What you owe, set against what you own, gives your real net worth.", "INR"),
    FieldDef("equity_holdings", "Equity investments", "money",
             "What is the current value of your stocks and equity mutual funds? Enter 0 if none.",
             "How your money is split between growth and safer assets shapes both risk and returns.", "INR"),
    FieldDef("debt_holdings", "Debt investments", "money",
             "What is the value of your bonds, PPF/EPF, debt funds and fixed deposits (other than the liquid savings you already told me about)? Enter 0 if none.",
             "How your money is split between growth and safer assets shapes both risk and returns.", "INR"),
    FieldDef("other_assets", "Other assets", "money",
             "What is the value of everything else you own that you could sell or use (gold, property other than your home, other investments)? Enter 0 if none.",
             "Everything you own, together with what you owe, gives your net worth.", "INR"),
    FieldDef("pending_goals", "Pending financial goals", "int",
             "How many financial goals are you still working towards (a home, education, a wedding, a car...)? Enter 0 if none.",
             "The more goals compete for the same money, the more planning each one needs.", "goals", min=0, max=20),
    FieldDef("life_cover_amount", "Life insurance cover", "money",
             "What is the total sum assured across your life insurance policies? Enter 0 if none.",
             "This shows whether your family's income would be protected.", "INR"),
    FieldDef("health_cover_amount", "Health insurance cover", "money",
             "What is your total health insurance cover, including any family floater or top-up? Enter 0 if none.",
             "A medical event is one of the biggest threats to savings.", "INR"),
    FieldDef("kids", "Children", "int", "How many children do you have? Enter 0 if none.",
             "Children bring long-term goals such as education.", "children", min=0, max=15),
    FieldDef("kids_goal_planned", "Money set aside for children", "bool",
             "Have you started setting money aside for your children's education or future? (Answer no if you have no children.)",
             "Planning early for children's goals makes them far easier to fund."),
    FieldDef("section_80c", "Yearly 80C investments", "money",
             "How much do you invest or pay each year under Section 80C (EPF, PPF, ELSS, life insurance premium, tuition fees)? Enter 0 if none.",
             "Using tax-saving options well keeps more of your income working for you.", "INR/year"),
    FieldDef("section_80d", "Yearly 80D premiums", "money",
             "How much do you pay each year in health insurance premiums that qualify for Section 80D? Enter 0 if none.",
             "Using tax-saving options well keeps more of your income working for you.", "INR/year"),
    FieldDef("life_expectancy", "Age your money should last until", "int",
             "Up to what age should your money last? (80 to 85 is a common planning age.)",
             "I need this to work out how large your retirement fund has to be.", "years", min=60, max=110),
    FieldDef("risk_profile", "Comfort with investment risk", "choice",
             "How would you describe your comfort with investment risk: conservative, moderately conservative, balanced, moderately aggressive or aggressive?",
             "It sets the returns it is reasonable to plan for. This is a planning assumption, not a product recommendation.",
             choices=("moderately aggressive", "moderately conservative", "aggressive", "conservative", "balanced")),
]}  # fmt: skip

# Fields the interview asks about, in default priority order (the selector reorders by relevance/coverage).
# home_ownership is still understood when volunteered but no longer asked: neither score uses it (2026-11-18).
INTERVIEW_ORDER = (
    "annual_income", "monthly_expenses", "liquid_assets", "monthly_emi_total", "has_health_insurance",
    "has_term_insurance", "age", "dependants", "retirement_age", "monthly_investment",
    "loans_outstanding", "equity_holdings", "debt_holdings", "other_assets", "pending_goals", "life_cover_amount",
    "health_cover_amount", "kids", "kids_goal_planned", "section_80c", "section_80d", "life_expectancy", "risk_profile",
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
