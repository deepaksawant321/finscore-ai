"""Facts that follow logically from other facts, filled in so the user is never asked the obvious.

Each rule only fills a field that is still unknown, and records it as DERIVED (source_ref `derived:<rule>`), so anything
the user states later wins (USER_STATED outranks DERIVED). If the condition stops holding (e.g. the user now reports an
EMI), the derived value is withdrawn again rather than left stale. Nothing here is an assumption or an estimate: those
live in `quick.py` and are recorded as ESTIMATED.
"""

import uuid
from collections.abc import Callable
from dataclasses import dataclass
from decimal import Decimal

from app.domains.profile.service import ProfileService

Raw = dict[str, Decimal | bool | None]


@dataclass(frozen=True)
class Rule:
    key: str  # used in source_ref
    field: str  # the field it fills
    applies: Callable[[Raw], bool]
    value: str
    why: str  # shown to the user


def _is(raw: Raw, field: str, value: Decimal | bool) -> bool:
    v = raw.get(field)
    return v is not None and v == value


RULES: tuple[Rule, ...] = (
    Rule("no_emi_no_loans", "loans_outstanding", lambda r: _is(r, "monthly_emi_total", Decimal(0)), "0",
         "you pay no loan EMIs"),
    Rule("no_health_cover_amount", "health_cover_amount", lambda r: _is(r, "has_health_insurance", False), "0",
         "you have no health insurance"),
    Rule("no_health_no_80d", "section_80d", lambda r: _is(r, "has_health_insurance", False) or _is(r, "health_cover_amount", Decimal(0)),
         "0", "you pay no health insurance premium"),
    Rule("health_cover_means_insured", "has_health_insurance",
         lambda r: isinstance(r.get("health_cover_amount"), Decimal) and r["health_cover_amount"] > 0, "true",  # type: ignore[operator]
         "you told me your health cover"),
    Rule("no_health_cover_not_insured", "has_health_insurance", lambda r: _is(r, "health_cover_amount", Decimal(0)), "false",
         "your health cover is zero"),
    Rule("no_life_cover_no_term", "has_term_insurance", lambda r: _is(r, "life_cover_amount", Decimal(0)), "false",
         "your life cover is zero"),
)  # fmt: skip

WHY = {f"derived:{r.key}": r.why for r in RULES}


def not_applicable(raw: Raw) -> set[str]:
    """Fields that make no sense to ask about given what is known (the interview skips them)."""
    out: set[str] = set()
    if _is(raw, "kids", Decimal(0)):
        out.add("kids_goal_planned")
    return out


async def refresh(profile: ProfileService, user_id: uuid.UUID, request_id: str | None = None) -> list[str]:
    """Applies every rule until nothing changes; returns the fields that were filled or withdrawn."""
    touched: list[str] = []
    for _ in range(3):  # rules can enable each other (cover amount 0 -> not insured -> no 80D); three passes settle them
        changed = False
        facts = {f.field_key: f for f in await profile.current_facts(user_id)}
        raw = await profile.raw_inputs(user_id)
        for rule in RULES:
            current = facts.get(rule.field)
            ref = f"derived:{rule.key}"
            if rule.applies(raw):
                if current is None:
                    await profile.record_fact(user_id, rule.field, rule.value, source_type="DERIVED", source_ref=ref,
                                              request_id=request_id)  # fmt: skip
                    facts[rule.field] = (await profile.current_fact(user_id, rule.field)) or current  # type: ignore[assignment]
                    touched.append(rule.field)
                    changed = True
            elif current is not None and current.source_type == "DERIVED" and current.source_ref == ref:
                await profile.retract_fact(user_id, current.id, request_id)
                facts.pop(rule.field, None)
                touched.append(rule.field)
                changed = True
        if not changed:
            break
    return touched
