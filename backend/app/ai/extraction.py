"""Free text -> candidate financial facts.

Two layers:
  1. Deterministic rule extractor (always on). All unit conversion (lakh/crore, monthly<->annual, summing) happens here, in code.
  2. Optional LLM extractor (only when a provider is configured). It may only COPY the user's words; every candidate is validated
     against the field catalogue and, for money, must be grounded in an amount actually present in the user's text.
Candidates are PROPOSALS: nothing is stored as a fact until the user confirms (blueprint: never invent missing data).
"""

import json
import re
from dataclasses import dataclass
from decimal import Decimal

from app.ai.gateway import LLMMessage, LLMProvider, LLMUnavailable
from app.ai.prompts import get_prompt
from app.domains.profile.catalog import FIELDS, InvalidFact, normalise_value
from app.engines.money import AmountMention, find_amounts

# Split into clauses without breaking decimals ("1.5 lakh"), "Rs. 5" or digit groups ("2,50,000").
_CLAUSE_SPLIT = re.compile(r"(?<!\d)(?<![Rr][Ss])\.(?!\d)|[;!?\n]+|,\s|\band\b|\bbut\b", re.IGNORECASE)
_MONTHLY = re.compile(r"per month|a month|monthly|/\s*month|\bpm\b|every month|each month|\bp\.m\b", re.IGNORECASE)
_ANNUAL = re.compile(r"per year|a year|annual|annually|yearly|per annum|\bpa\b|/\s*year|\blpa\b|\bctc\b|package", re.IGNORECASE)
_NEG = re.compile(r"\b(no|not|don'?t|do not|dont|without|never|zero|nil)\b", re.IGNORECASE)
_WORDS = {"zero": 0, "no": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6}


@dataclass(frozen=True)
class Candidate:
    field_key: str
    value: str  # canonical (catalog.normalise_value)
    evidence: str  # the user's words
    rationale: str
    confidence: Decimal
    origin: str  # 'rules' | 'llm'


def _amounts(clause: str) -> list[AmountMention]:
    return find_amounts(clause)


def _annual(a: Decimal, clause: str) -> Decimal:
    return a * 12 if _MONTHLY.search(clause) and not _ANNUAL.search(clause) else a


def _monthly(a: Decimal, clause: str) -> Decimal:
    return a / 12 if _ANNUAL.search(clause) and not _MONTHLY.search(clause) else a


def _mk(key: str, raw: object, evidence: str, rationale: str, conf: str = "0.9", origin: str = "rules") -> Candidate | None:
    try:
        v = normalise_value(FIELDS[key], raw)
    except InvalidFact:
        return None
    return Candidate(key, v, evidence.strip(), rationale, Decimal(conf), origin)


def _sum_parts(key: str, parts: list[tuple[Decimal, str]], what: str) -> Candidate | None:
    if not parts:
        return None
    total = sum((p for p, _ in parts), Decimal(0))
    ev = "; ".join(e for _, e in parts)
    rationale = what if len(parts) == 1 else f"{what}: sum of {len(parts)} amounts you mentioned"
    return _mk(key, total, ev, rationale, "0.9" if len(parts) == 1 else "0.75")


def rule_extract(text: str, awaiting: str | None = None) -> list[Candidate]:
    clauses = [c.strip() for c in _CLAUSE_SPLIT.split(text) if c and c.strip()]
    income: list[tuple[Decimal, str]] = []
    expenses: list[tuple[Decimal, str]] = []
    emi: list[tuple[Decimal, str]] = []
    liquid: list[tuple[Decimal, str]] = []
    sip: list[tuple[Decimal, str]] = []
    out: dict[str, Candidate] = {}

    def put(c: Candidate | None) -> None:
        if c is not None and c.field_key not in out:
            out[c.field_key] = c

    for cl in clauses:
        low = cl.lower()
        amts = _amounts(cl)
        if (
            re.search(r"\b(earn|earns|earning|salary|income|makes?|package|ctc)\b", low)
            and amts
            and not re.search(r"\binvest", low)
        ):
            income += [(_annual(a.value, cl), cl) for a in amts[:1]]
        if re.search(r"\b(spend|spends|spending|expenses?|living cost|outgo)\b", low) and amts:
            expenses += [(_monthly(a.value, cl), cl) for a in amts[:1]]
        if re.search(r"\b(emis?|loans?|instal+ments?)\b", low):
            if re.search(
                r"\b(no|zero|nil)\s+(loans?|emis?|debts?)\b|debt[- ]free|(don'?t|do not) have any (loans?|debts?|emis?)", low
            ):
                put(_mk("monthly_emi_total", 0, cl, "you said you have no loans", "0.85"))
            elif amts:
                emi += [(_monthly(a.value, cl), cl) for a in amts[:1]]
        if (
            re.search(r"\b(savings?|saved|bank balance|fds?|fixed deposits?|liquid|emergency fund)\b", low)
            and amts
            and not _MONTHLY.search(cl)
        ):
            liquid += [(amts[0].value, cl)]
        if (
            re.search(r"\b(sips?|invest(ing|s|ed)?|mutual funds?)\b", low)
            and amts
            and not re.search(r"corpus|portfolio|worth|total", low)
        ):
            sip += [(_monthly(amts[0].value, cl), cl)]
        if m := re.search(r"term (insurance|plan|life|cover)", low):
            put(
                _mk("has_term_insurance", "no" if _NEG.search(low[: m.start()]) else "yes", cl, "term insurance mentioned", "0.8")
            )
        if m := re.search(r"(health|medical|mediclaim)( insurance| cover| policy| plan)?", low):
            if re.search(r"insurance|cover|policy|plan|mediclaim", low):
                put(
                    _mk(
                        "has_health_insurance",
                        "no" if _NEG.search(low[: m.start()]) else "yes",
                        cl,
                        "health insurance mentioned",
                        "0.8",
                    )
                )
        if m := re.search(r"\b(?:i am|i'm|im|age|aged)\s*(?P<n>\d{2})\b", low) or re.search(
            r"\b(?P<n>\d{2})\s*(?:years? old|yrs? old|yo)\b", low
        ):
            put(_mk("age", m.group("n"), cl, "age mentioned", "0.85"))
        if m := re.search(r"\b(\d+|one|two|three|four|five|six|no|zero)\s*(kids?|children|child|dependants?|dependents?)\b", low):
            n = m.group(1)
            put(_mk("dependants", _WORDS.get(n, n), cl, "dependants mentioned", "0.8"))
        if re.search(r"\b(own|bought|purchased)\b.*\b(home|house|flat|apartment)\b", low) and not _NEG.search(low):
            put(_mk("home_ownership", "own", cl, "you said you own your home", "0.8"))
        elif re.search(r"\b(rent|rented|renting)\b", low):
            put(_mk("home_ownership", "rent", cl, "you mentioned renting", "0.75"))
        if m := re.search(r"retire\w*\s*(?:at|by|around|when i am)?\s*(?:age\s*)?(\d{2})\b", low):
            put(_mk("retirement_age", m.group(1), cl, "retirement age mentioned", "0.85"))

    put(_sum_parts("annual_income", income, "annual household income"))
    put(_sum_parts("monthly_expenses", expenses, "monthly expenses"))
    if "monthly_emi_total" not in out:
        put(_sum_parts("monthly_emi_total", emi, "total monthly EMIs"))
    put(_sum_parts("liquid_assets", liquid, "liquid savings"))
    put(_sum_parts("monthly_investment", sip, "monthly investments"))

    # Short direct answer to the question I just asked.
    if awaiting and awaiting in FIELDS and awaiting not in out:
        c = _answer_to(awaiting, text)
        if c:
            out[awaiting] = c
    return list(out.values())


def _answer_to(key: str, text: str) -> Candidate | None:
    f, low = FIELDS[key], text.lower().strip()
    if f.kind == "money":
        amts = _amounts(text)
        if amts:
            v = _annual(amts[0].value, text) if key == "annual_income" else (
                _monthly(amts[0].value, text) if key in ("monthly_expenses", "monthly_emi_total", "monthly_investment") else amts[0].value
            )  # fmt: skip
            return _mk(key, v, text, "your answer to my question", "0.8")
        if re.fullmatch(r"(none|nil|zero|no|nothing|0)\.?", low):
            return _mk(key, 0, text, "your answer to my question", "0.8")
    elif f.kind == "bool":
        if re.fullmatch(r"(yes|yeah|yep|y|yup|sure|have|i do)\.?", low):
            return _mk(key, "yes", text, "your answer to my question", "0.85")
        if re.fullmatch(r"(no|nope|n|nah|don'?t|i don'?t)\.?|.*\b(don'?t|do not) have.*", low):
            return _mk(key, "no", text, "your answer to my question", "0.85")
    elif f.kind == "int":
        m = re.search(r"\b(\d{1,3})\b", low)
        if m:
            return _mk(key, m.group(1), text, "your answer to my question", "0.8")
        for w, n in _WORDS.items():
            if re.search(rf"\b{w}\b", low):
                return _mk(key, n, text, "your answer to my question", "0.7")
    else:
        for ch in f.choices:
            if re.search(rf"\b{ch}\b", low):
                return _mk(key, ch, text, "your answer to my question", "0.8")
    return None


# ---------------------------- optional LLM layer ----------------------------
def _grounded_money(value: Decimal, text: str) -> bool:
    """A money value from the LLM is accepted only if it equals an amount in the user's text (optionally x12 or /12 — conversions the
    rules layer also performs). The LLM never invents or computes numbers."""
    for a in find_amounts(text):
        if value in (a.value, a.value * 12, a.value / 12):
            return True
    return False


def _parse_json_array(s: str) -> list[dict[str, object]]:
    s = s.strip()
    if s.startswith("```"):
        s = re.sub(r"^```\w*\n?|```$", "", s).strip()
    try:
        data = json.loads(s)
    except json.JSONDecodeError:
        return []
    return [d for d in data if isinstance(d, dict)] if isinstance(data, list) else []


async def llm_extract(provider: LLMProvider, text: str) -> list[Candidate]:
    system, _version = get_prompt("extract_facts", "v1", field_keys=", ".join(FIELDS))
    try:
        res = await provider.complete(system=system, messages=[LLMMessage("user", text)], max_tokens=600)
    except LLMUnavailable:
        return []
    out: list[Candidate] = []
    for item in _parse_json_array(res.text):
        key, raw, ev = item.get("field_key"), item.get("value"), item.get("evidence")
        if not isinstance(key, str) or key not in FIELDS or not isinstance(ev, str) or ev.lower() not in text.lower():
            continue  # unknown field, or evidence is not the user's own words => reject
        f = FIELDS[key]
        if f.kind == "money":
            ams = find_amounts(str(raw))
            if not ams:
                continue
            val = ams[0].value
            if key == "annual_income":
                val = _annual(val, ev)
            elif key in ("monthly_expenses", "monthly_emi_total", "monthly_investment"):
                val = _monthly(val, ev)
            if not _grounded_money(val, text):
                continue
            raw = val
        c = _mk(key, raw, ev, "read from your message by the AI assistant (please check)", "0.6", "llm")
        if c:
            out.append(c)
    return out


async def extract(text: str, awaiting: str | None, provider: LLMProvider | None) -> list[Candidate]:
    cands = {c.field_key: c for c in rule_extract(text, awaiting)}
    if provider is not None:
        for c in await llm_extract(provider, text):
            cands.setdefault(c.field_key, c)  # rules win on conflict
    return list(cands.values())
