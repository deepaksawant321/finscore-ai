"""Money Map: the interview as short chapters of tap-to-answer cards (approved 2026-11-18).

Each card asks for one profile field (or, for `savings_mix`, a savings total plus how it is invested, which becomes an
ESTIMATED equity/debt split exactly as in the quick score). The question bank is the field catalogue: cards only add
quick-tap chips and a friendlier prompt where the chat wording does not fit a card.

A card is done when its field is known from the user or worked out from their answers (DERIVED). An ESTIMATED value is
not done: the card shows the assumption and offers "Keep it" or a change. A card whose `ask_when` is false is not
applicable and is skipped (e.g. loans still owed when there are no EMIs).
"""

from collections.abc import Callable
from dataclasses import dataclass, field
from decimal import Decimal

Raw = dict[str, Decimal | bool | None]
L = 100_000


def _gt0(key: str) -> Callable[[Raw], bool]:
    def f(r: Raw) -> bool:
        v = r.get(key)
        return isinstance(v, Decimal) and v > 0

    return f


@dataclass(frozen=True)
class Card:
    key: str  # field key, or "savings_mix"
    prompt: str | None = None  # None = the catalogue question
    chips: tuple[tuple[str, str], ...] = ()  # (label, value)
    per_month_to_year: bool = False  # card asks per month, the field stores per year
    ask_when: Callable[[Raw], bool] | None = None
    unsure_ok: bool = True  # "Not sure, ask me later"


@dataclass(frozen=True)
class Chapter:
    key: str
    title: str
    blurb: str
    cards: tuple[Card, ...] = field(default_factory=tuple)


NONE = ("None", "0")
CHAPTERS: tuple[Chapter, ...] = (
    Chapter("snapshot", "Snapshot", "A handful of quick taps and your FinScore appears.", (
        Card("age", "How old are you?", unsure_ok=False),
        Card("annual_income", "What is your household income per month, before tax?",
             (("50k", "50000"), ("1L", str(L)), ("2L", str(2 * L)), ("5L", str(5 * L))), per_month_to_year=True, unsure_ok=False),
        Card("monthly_expenses", "What does your household spend in a typical month (not counting EMIs or investments)?",
             (("25k", "25000"), ("50k", "50000"), ("1L", str(L)), ("2L", str(2 * L)))),
        Card("monthly_emi_total", "How much goes to loan EMIs each month?", (NONE, ("10k", "10000"), ("25k", "25000"), ("50k", "50000"))),
        Card("loans_outstanding", "How much do you still owe on those loans in total?",
             (("5L", str(5 * L)), ("10L", str(10 * L)), ("25L", str(25 * L)), ("50L", str(50 * L))), ask_when=_gt0("monthly_emi_total")),
        Card("monthly_investment", "How much do you invest every month (SIPs etc.)?", (NONE, ("5k", "5000"), ("10k", "10000"), ("25k", "25000"))),
        Card("savings_mix", "All your savings and investments together (not your home), and how they are mostly invested?",
             (NONE, ("1L", str(L)), ("5L", str(5 * L)), ("10L", str(10 * L)), ("25L", str(25 * L)))),
        Card("other_assets", "Any gold, or property other than your home?", (NONE, ("2L", str(2 * L)), ("10L", str(10 * L)), ("50L", str(50 * L)))),
    )),
    Chapter("family", "Family & protection", "Who depends on you, and how well they are covered.", (
        Card("dependants", "How many people depend on your income?", (("0", "0"), ("1", "1"), ("2", "2"), ("3", "3"), ("4+", "4"))),
        Card("kids", "How many children do you have?", (("0", "0"), ("1", "1"), ("2", "2"), ("3+", "3"))),
        Card("kids_goal_planned", "Have you started saving for their education or future?", ask_when=_gt0("kids")),
        Card("health_cover_amount", "How much health insurance cover do you have (family floater and top-ups included)?",
             (NONE, ("5L", str(5 * L)), ("10L", str(10 * L)), ("25L", str(25 * L)))),
        Card("life_cover_amount", "What is your total life insurance cover?", (NONE, ("50L", str(50 * L)), ("1Cr", str(100 * L)), ("2Cr", str(200 * L)))),
        Card("has_term_insurance", "Is any of that a term plan?", ask_when=_gt0("life_cover_amount")),
    )),
    Chapter("future", "Future you", "Your goals and the retirement you are planning for.", (
        Card("pending_goals", "How many goals are you saving for (a home, education, a wedding, a car…)?",
             (("0", "0"), ("1", "1"), ("2", "2"), ("3", "3"), ("4+", "4"))),
        Card("retirement_age", "At what age would you like to retire?", (("50", "50"), ("55", "55"), ("60", "60"), ("65", "65"))),
        Card("life_expectancy", "Up to what age should your money last?", (("80", "80"), ("85", "85"), ("90", "90"))),
        Card("risk_profile", "How comfortable are you with ups and downs in your investments?"),
    )),
    Chapter("safety", "Safety net", "How long you could manage if income stopped.", (
        Card("liquid_assets", "How much could you use within a few days (savings account, liquid funds, FDs)?",
             (NONE, ("50k", "50000"), ("2L", str(2 * L)), ("5L", str(5 * L)), ("10L", str(10 * L)))),
    )),
    Chapter("tax", "Tax smart", "How well you use the tax-saving options you have.", (
        Card("section_80c", "How much do you put into 80C each year (EPF, PPF, ELSS, life premium, tuition)?",
             (NONE, ("50k", "50000"), ("1L", str(L)), ("1.5L", "150000"))),
        Card("section_80d", "How much health insurance premium do you pay each year (80D)?", (NONE, ("10k", "10000"), ("25k", "25000"), ("50k", "50000"))),
    )),
    Chapter("finetune", "Fine-tune", "Swap my estimates for your real numbers.", (
        Card("equity_holdings", "How much is in shares and equity mutual funds?", (NONE, ("1L", str(L)), ("5L", str(5 * L)), ("10L", str(10 * L)))),
        Card("debt_holdings", "How much is in PF/PPF, bonds and debt funds (not counting the savings you can use within days)?",
             (NONE, ("1L", str(L)), ("5L", str(5 * L)), ("10L", str(10 * L)))),
    )),
)  # fmt: skip

CHAPTER_BY_KEY = {c.key: c for c in CHAPTERS}
CARD_CHAPTER = {card.key: ch.key for ch in CHAPTERS for card in ch.cards}

# Friendlier names for the workbook factors, used in the instant facts.
FRIENDLY = {
    "F01": "Cash flow", "F02": "Savings rate", "F03": "Assets", "F04": "Net worth", "F05": "Investment mix",
    "F06": "Income", "F07": "Goals", "F08": "Retirement readiness", "F09": "Loan burden", "F10": "Investing habit",
    "F11": "Life cover", "F12": "Health cover", "F13": "80C use", "F14": "80D use", "F15": "Children's goals",
}  # fmt: skip
