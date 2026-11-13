"""Pure money helpers. No I/O. All financial amounts are Decimal, never float."""

import re
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation

TWO_PLACES = Decimal("0.01")


@dataclass(frozen=True)
class Calc:
    """A deterministic result plus the assumptions it depends on (shown to users, stored for audit)."""

    value: Decimal
    assumptions: tuple[str, ...] = ()


def D(x: int | str | Decimal) -> Decimal:  # noqa: N802
    """Convert to Decimal without float contamination (floats are rejected on purpose)."""
    if isinstance(x, float):
        raise TypeError("floats are not allowed in financial calculations")
    return x if isinstance(x, Decimal) else Decimal(x)


def round_money(x: Decimal) -> Decimal:
    """Round to 2 dp, half-up. Rounding policy is a Rulebook item (PENDING approval); half-up is the interim default."""
    return x.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


_UNITS = {
    "k": Decimal(1_000), "thousand": Decimal(1_000),
    "l": Decimal(100_000), "lac": Decimal(100_000), "lakh": Decimal(100_000), "lakhs": Decimal(100_000), "lacs": Decimal(100_000),
    "cr": Decimal(10_000_000), "crore": Decimal(10_000_000), "crores": Decimal(10_000_000),
}  # fmt: skip
_AMOUNT = re.compile(
    r"(?:₹|rs\.?|inr)?\s*(?P<num>\d[\d,]*(?:\.\d+)?)\s*(?P<unit>crores?|cr|lakhs?|lacs?|lac|l|thousand|k)?\b", re.IGNORECASE
)


@dataclass(frozen=True)
class AmountMention:
    value: Decimal
    span: tuple[int, int]
    text: str


def find_amounts(text: str) -> list[AmountMention]:
    """Find rupee amounts such as '₹22 lakh', '34L', '1.5 crore', '50k', '2,50,000'. Pure string parsing, no LLM."""
    out: list[AmountMention] = []
    for m in _AMOUNT.finditer(text):
        try:
            num = Decimal(m.group("num").replace(",", ""))
        except InvalidOperation:
            continue
        unit = (m.group("unit") or "").lower()
        out.append(AmountMention(num * _UNITS.get(unit, Decimal(1)), m.span(), m.group(0).strip()))
    return out


def format_inr(v: Decimal | str | int) -> str:
    """Display only: rupees with lakh/crore grouping, no decimals (e.g. 1234567 -> '₹12,34,567')."""
    n = int(round_money(D(str(v))))
    s = str(abs(n))
    head, tail = s[:-3], s[-3:]
    parts: list[str] = []
    while len(head) > 2:
        parts.insert(0, head[-2:])
        head = head[:-2]
    if head:
        parts.insert(0, head)
    return ("-" if n < 0 else "") + "₹" + (",".join([*parts, tail]) if parts else tail)
