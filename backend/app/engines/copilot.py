"""Pure pre-action check engine (AC-18, AI Financial Copilot). Blueprint: "read-only/hand-off only until execution
approved" — this module never executes anything and never produces a recommendation to buy a specific product. It only
runs deterministic checks over the user's own numbers and flags when a decision needs a human (hand-off), never the AI.

No LLM: every finding here is a template sentence filled from Decimal arithmetic, same rule as the other engines.
"""

from dataclasses import dataclass
from decimal import Decimal
from typing import Literal

from app.engines.actions import Change
from app.engines.money import format_inr

Level = Literal["ok", "info", "warning", "blocker"]
INSURANCE_FIELDS = ("has_health_insurance", "has_term_insurance")


@dataclass(frozen=True)
class Thresholds:
    """Rulebook data (PENDING PRODUCT APPROVAL): when a margin counts as thin, and when a spending cut counts as large."""

    thin_margin_ratio: Decimal
    large_cut_ratio: Decimal


@dataclass(frozen=True)
class Finding:
    level: Level
    code: str
    message: str
    hand_off: bool = False  # true => this is a decision for the user or a qualified human, not for the Copilot to settle


def affordability(income: Decimal | None, committed_monthly: Decimal | None, t: Thresholds) -> Finding | None:
    """One shared check used before accepting an action or changing a goal's funding: does the user's income cover
    everything they would be committed to each month afterwards? None when the inputs needed are unknown."""
    if income is None or committed_monthly is None:
        return None
    margin = income - committed_monthly
    if margin < 0:
        return Finding("blocker", "deficit",
                       f"This would commit {format_inr(committed_monthly)} a month against income of {format_inr(income)} — "
                       f"a shortfall of {format_inr(-margin)} every month.")  # fmt: skip
    if margin <= income * t.thin_margin_ratio:
        pct = round(t.thin_margin_ratio * 100)
        return Finding("warning", "thin_margin",
                       f"After this you would have about {format_inr(margin)} left each month, a thin margin — "
                       f"under {pct}% of your income.")  # fmt: skip
    return Finding("ok", "affordable", f"This leaves you about {format_inr(margin)} a month, before anything else changes.")


def action_notes(
    change: Change, old_value: Decimal | bool | None, new_value: Decimal | bool | None, t: Thresholds
) -> list[Finding]:
    """Checks specific to the KIND of change an action proposes. Pure: no income lookup, no I/O."""
    out: list[Finding] = []
    if (
        change.kind == "target_savings_rate"
        and isinstance(old_value, Decimal)
        and isinstance(new_value, Decimal)
        and old_value > 0
    ):
        cut = (old_value - new_value) / old_value
        if cut >= t.large_cut_ratio:
            out.append(Finding("warning", "large_cut",
                               f"This asks you to cut spending by about {round(cut * 100)}%. A change that size is often "
                               "hard to sustain all at once — consider a smaller step first."))  # fmt: skip
    elif change.kind == "target_debt_ratio":
        out.append(Finding("info", "needs_lender",
                           "Lowering an EMI usually means prepaying or refinancing with your lender. I can't do that for "
                           "you; this is something to arrange yourself."))  # fmt: skip
    elif change.kind == "multiple_of":
        out.append(Finding("info", "target_not_immediate",
                           "This is a target to build toward over time, not an amount to move all at once."))  # fmt: skip
    elif change.kind == "set" and change.field in INSURANCE_FIELDS:
        out.append(Finding("info", "product_choice",
                           "Choosing an insurance product is a decision I can't make for you. Compare options yourself "
                           "or with a qualified adviser.", hand_off=True))  # fmt: skip
    return out
