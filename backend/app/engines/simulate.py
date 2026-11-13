"""Pure projection core for simulations. No I/O. Every rate is a CALLER-SUPPLIED assumption: the Rulebook's simulation assumptions
are PENDING PRODUCT APPROVAL (D-B7), so nothing here has a default return, inflation or step-up."""

from dataclasses import dataclass
from decimal import Decimal

from app.engines import growth
from app.engines.money import D, round_money

MAX_YEARS = 60
MAX_RATE = Decimal(30)  # sanity cap on a user-typed annual percentage (not a financial rule)


@dataclass(frozen=True)
class YearPoint:
    year: int
    balance: Decimal
    contributed: Decimal


@dataclass(frozen=True)
class InvestResult:
    final_value: Decimal
    total_contributed: Decimal
    gain: Decimal
    real_value: Decimal | None  # in today's rupees, only when an inflation assumption was supplied
    schedule: tuple[YearPoint, ...]
    assumptions: tuple[str, ...]


def check_rate(name: str, pct: Decimal) -> Decimal:
    p = D(pct)
    if not (Decimal(0) <= p <= MAX_RATE):
        raise ValueError(f"{name} must be between 0 and {MAX_RATE} percent")
    return p


def invest(
    monthly: Decimal, lumpsum: Decimal, return_pct: Decimal, years: int, inflation_pct: Decimal | None = None
) -> InvestResult:
    if not (1 <= years <= MAX_YEARS):
        raise ValueError(f"years must be between 1 and {MAX_YEARS}")
    m, lump = D(monthly), D(lumpsum)
    if m < 0 or lump < 0:
        raise ValueError("amounts must be zero or positive")
    ret = check_rate("return", return_pct)
    r = ret / Decimal(1200)
    bal, points = lump, []
    for month in range(1, years * 12 + 1):  # month-end contributions, identical convention to growth.fv_sip
        bal = bal * (1 + r) + m
        if month % 12 == 0:
            points.append(YearPoint(month // 12, round_money(bal), round_money(lump + m * month)))
    total = round_money(lump + m * years * 12)
    final = growth.fv_lumpsum(lump, ret, years * 12).value + growth.fv_sip(m, ret, years * 12).value
    real = None
    if inflation_pct is not None:
        infl = check_rate("inflation", inflation_pct)
        real = round_money(final / ((1 + infl / 100) ** years))
    notes = [
        f"Return assumed by you: {ret}% a year, compounded monthly",
        "Contributions are made at the end of each month",
        "Projection, not a guarantee; excludes tax and fees",
    ]
    if inflation_pct is not None:
        notes.append(f"Inflation assumed by you: {D(inflation_pct)}% a year (used only for the value in today's rupees)")
    return InvestResult(round_money(final), total, round_money(final - total), real, tuple(points), tuple(notes))
