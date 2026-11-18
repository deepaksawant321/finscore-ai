"""Quick score: one screen of answers -> profile facts, so a user gets a score in about a minute.

Three kinds of value are written, and each is labelled so nothing is passed off as something the user said:
  * USER_STATED (`source_ref = quick_score`): what the user entered on the screen;
  * DERIVED: what follows logically from it (see `derive.py`, e.g. no EMIs -> no loans outstanding);
  * ESTIMATED (`source_ref = assumed:<what>`): planning assumptions and the equity/debt split implied by the mix chip.
    These are PLACEHOLDERS approved for the quick journey (2026-11-18), shown as "assumed" and editable at any time.
Estimates never replace something the user has stated (ESTIMATED is the lowest-ranked source).
"""

import uuid
from dataclasses import dataclass
from decimal import Decimal

from app.domains.profile import derive
from app.domains.profile.service import ProfileService
from app.engines.money import D

# PLACEHOLDER planning assumptions (approved for the quick journey, not by the Rulebook process).
ASSUMED_RETIREMENT_AGE = 60
ASSUMED_LIFE_EXPECTANCY = 85
# Share of savings & investments assumed to be in equity, by the mix the user picked (PLACEHOLDER).
EQUITY_SHARE = {"mostly_safe": Decimal("0.2"), "balanced": Decimal("0.5"), "mostly_equity": Decimal("0.8")}


def assumed_risk_profile(age: int) -> str:
    """Planning assumption only (which return to plan with), not a risk-profiling methodology. PLACEHOLDER age bands."""
    if age < 35:
        return "moderately aggressive"
    if age < 50:
        return "balanced"
    return "moderately conservative"


@dataclass(frozen=True)
class QuickAnswers:
    age: int
    monthly_income: Decimal
    monthly_expenses: Decimal
    monthly_emi: Decimal
    loans_outstanding: Decimal | None  # only asked when there are EMIs
    monthly_investment: Decimal
    savings_total: Decimal  # savings + investments, excluding the home
    mix: str  # mostly_safe | balanced | mostly_equity
    other_assets: Decimal
    dependants: int
    kids: int
    kids_goal_planned: bool | None  # only asked when there are children
    health_cover: Decimal  # 0 = none
    life_cover: Decimal  # 0 = none
    pending_goals: int


async def apply(profile: ProfileService, user_id: uuid.UUID, a: QuickAnswers, request_id: str | None = None) -> None:
    async def stated(key: str, value: object) -> None:
        await profile.record_fact(user_id, key, value, source_type="USER_STATED", source_ref="quick_score",
                                  user_correction=True, request_id=request_id)  # fmt: skip

    async def estimated(key: str, value: object, what: str) -> None:
        current = await profile.current_fact(user_id, key)
        if current is not None and current.source_type != "ESTIMATED":
            return  # never override something the user stated or that was worked out from it
        await profile.record_fact(user_id, key, value, source_type="ESTIMATED", source_ref=f"assumed:{what}",
                                  confidence=Decimal("0.5"), request_id=request_id)  # fmt: skip

    await stated("age", a.age)
    await stated("annual_income", a.monthly_income * 12)
    await stated("monthly_expenses", a.monthly_expenses)
    await stated("monthly_emi_total", a.monthly_emi)
    if a.loans_outstanding is not None:
        await stated("loans_outstanding", a.loans_outstanding)
    await stated("monthly_investment", a.monthly_investment)
    await stated("other_assets", a.other_assets)
    await stated("dependants", a.dependants)
    await stated("kids", a.kids)
    if a.kids > 0 and a.kids_goal_planned is not None:
        await stated("kids_goal_planned", "true" if a.kids_goal_planned else "false")
    await stated("health_cover_amount", a.health_cover)
    await stated("life_cover_amount", a.life_cover)
    await stated("pending_goals", a.pending_goals)

    await record_savings_mix(profile, user_id, a.savings_total, a.mix, request_id)
    await record_planning_assumptions(profile, user_id, a.age, request_id)
    await derive.refresh(profile, user_id, request_id)


async def record_savings_mix(
    profile: ProfileService, user_id: uuid.UUID, total: Decimal, mix: str | None, request_id: str | None = None
) -> None:
    """One savings total + the mix chip -> equity and debt holdings. A zero total is exact (stated as 0 for both); any
    other split is an ESTIMATE from the chip and never overrides holdings the user stated."""
    if total == 0:
        for key in ("equity_holdings", "debt_holdings"):
            await profile.record_fact(user_id, key, 0, source_type="USER_STATED", source_ref="savings_total",
                                      user_correction=True, request_id=request_id)  # fmt: skip
        return
    share = EQUITY_SHARE[mix or "balanced"]
    equity = (total * share).quantize(D("0.01"))
    for key, value in (("equity_holdings", equity), ("debt_holdings", total - equity)):
        current = await profile.current_fact(user_id, key)
        if current is not None and current.source_type != "ESTIMATED":
            continue
        await profile.record_fact(user_id, key, value, source_type="ESTIMATED", source_ref=f"assumed:mix_{mix}",
                                  confidence=Decimal("0.5"), request_id=request_id)  # fmt: skip


async def record_planning_assumptions(
    profile: ProfileService, user_id: uuid.UUID, age: int, request_id: str | None = None
) -> None:
    """Retirement age, planning age and risk comfort as labelled ESTIMATES, only where the user has not said otherwise."""
    for key, value, what in (
        ("retirement_age", ASSUMED_RETIREMENT_AGE, "retirement_age"),
        ("life_expectancy", ASSUMED_LIFE_EXPECTANCY, "life_expectancy"),
        ("risk_profile", assumed_risk_profile(age), "risk_by_age"),
    ):
        current = await profile.current_fact(user_id, key)
        if current is not None and current.source_type != "ESTIMATED":
            continue
        await profile.record_fact(user_id, key, value, source_type="ESTIMATED", source_ref=f"assumed:{what}",
                                  confidence=Decimal("0.5"), request_id=request_id)  # fmt: skip
