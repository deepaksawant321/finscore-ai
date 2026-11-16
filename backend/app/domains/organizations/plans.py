"""Plans, entitlements and invoice maths. Pure functions: no database, no clock.

PLACEHOLDER (D-B13): plan names, prices, quotas, GST handling and the free tier are the values the workspace UI mock-up used,
not approved commercial terms. Product/Growth must confirm them. Change them here only; every endpoint reads this module.
"""

from dataclasses import dataclass
from decimal import Decimal

from app.engines.money import D, round_money

PLANS_ARE_PLACEHOLDER = True
GST_RATE = D("0.18")  # PLACEHOLDER: confirm rate, SAC code and place-of-supply rules with Finance
MODULE_IDS = ("score", "coach", "sim", "dna", "goals")
CONNECTOR_IDS = ("aa", "brokerage", "upload", "crm")
CYCLES = ("monthly", "yearly")


@dataclass(frozen=True)
class Plan:
    key: str
    name: str
    rank: int  # higher = bigger plan; used to tell an upgrade from a downgrade
    price_monthly: Decimal | None  # per month when billed monthly; None = contact sales
    price_yearly: Decimal | None  # per month when billed yearly
    scores_per_month: int | None  # None = negotiated
    hard_cap: bool  # True: calls stop at the quota. False: calls continue and the excess is billed as overage
    overage_per_score: Decimal
    seats: int | None
    domains: int | None
    max_modules: int | None
    live_allowed: bool
    can_remove_powered_by: bool
    self_serve: bool  # False: only via sales


PLANS: dict[str, Plan] = {
    "starter": Plan("starter", "Starter", 0, D(0), D(0), 100, True, D(0), 1, 1, 1, False, False, True),
    "growth": Plan("growth", "Growth", 1, D(24999), D(19999), 25_000, False, D("0.80"), 5, 3, 3, True, False, True),
    "enterprise": Plan("enterprise", "Enterprise", 2, None, None, None, False, D(0), None, None, None, True, True, False),
}
DEFAULT_PLAN = "starter"

# Who may do what inside an organisation. Matches the matrix the workspace UI shows.
PERMISSIONS: dict[str, tuple[str, ...]] = {
    "billing.manage": ("owner", "admin"),
    "branding.edit": ("owner", "admin"),
    "keys.manage": ("owner", "admin"),
    "scores.view": ("owner", "admin", "analyst", "viewer"),
    "data.export": ("owner", "admin", "analyst"),
    "members.manage": ("owner", "admin"),
}


def permissions_for(role: str) -> list[str]:
    return sorted(p for p, roles in PERMISSIONS.items() if role in roles)


def monthly_price(plan: Plan, cycle: str) -> Decimal | None:
    return plan.price_yearly if cycle == "yearly" else plan.price_monthly


@dataclass(frozen=True)
class Estimate:
    base: Decimal
    overage_scores: int
    overage_amount: Decimal
    subtotal: Decimal
    gst: Decimal
    total: Decimal


def estimate(plan: Plan, cycle: str, scores_used: int) -> Estimate | None:
    """Price one month. None for plans without a list price (Enterprise: contact sales)."""
    base = monthly_price(plan, cycle)
    if base is None or plan.scores_per_month is None:
        return None
    over = 0 if plan.hard_cap else max(0, scores_used - plan.scores_per_month)
    over_amt = round_money(plan.overage_per_score * over)
    subtotal = round_money(base + over_amt)
    gst = round_money(subtotal * GST_RATE)
    return Estimate(round_money(base), over, over_amt, subtotal, gst, round_money(subtotal + gst))


def is_upgrade(current: Plan, target: Plan, current_cycle: str, target_cycle: str) -> bool:
    """A plan change takes effect now only if it moves to a bigger plan. Same plan and a cheaper-or-equal cycle waits."""
    if target.rank != current.rank:
        return target.rank > current.rank
    a, b = monthly_price(current, current_cycle), monthly_price(target, target_cycle)
    return a is not None and b is not None and b > a


def seats_ok(plan: Plan, seats_in_use: int) -> bool:
    return plan.seats is None or seats_in_use <= plan.seats


def modules_ok(plan: Plan, modules: list[str]) -> bool:
    return plan.max_modules is None or len(modules) <= plan.max_modules
