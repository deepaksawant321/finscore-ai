"""Grounding guard: numbers in AI-written text must come from deterministic results (blueprint: no LLM-only arithmetic)."""

import re
from collections.abc import Iterable
from decimal import Decimal, InvalidOperation

_NUM = re.compile(r"\d[\d,]*(?:\.\d+)?")


def _canon(token: str) -> str | None:
    try:
        d = Decimal(token.replace(",", ""))
    except InvalidOperation:
        return None
    return format(d.normalize(), "f")


def numbers_in(text: str) -> set[str]:
    return {c for t in _NUM.findall(text) if (c := _canon(t)) is not None}


def numbers_grounded(text: str, allowed: Iterable[str | int | Decimal]) -> tuple[bool, set[str]]:
    """Return (ok, ungrounded_numbers). `allowed` are values from tool/engine results or the user's own message."""
    allowed_set = {c for a in allowed if (c := _canon(str(a))) is not None}
    bad = numbers_in(text) - allowed_set
    return (not bad), bad
