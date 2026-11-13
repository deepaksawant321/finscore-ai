"""Multi-label intent classification (blueprint section 2 lists 12 intents). Keyword baseline; an LLM classifier can be added behind
the gateway later. Deterministic and testable."""

import re

INTENT_PATTERNS: dict[str, str] = {
    "goal": r"\b(goal|target|save for|want to (buy|build|achieve))\b",
    "cash_flow": r"\b(save nothing|don'?t save|where my money goes|spend|spending|expenses?|salary is high|budget|surplus|cash ?flow)\b",
    "investment": r"\b(invest|investing|sip|mutual fund|stocks?|equity|portfolio)\b",
    "debt": r"\b(loans?|emi|debt|credit card|borrow|owe|interest rate)\b",
    "tax": r"\b(tax|80c|itr|deduction|regime)\b",
    "insurance": r"\b(insurance|insured|term plan|mediclaim|health cover|policy)\b",
    "retirement": r"\b(retire|retirement|pension|nps|corpus)\b",
    "major_purchase": r"\b(buy|purchase|afford)\b.*\b(house|home|flat|car|apartment|property)\b|\b(house|home|car)\b.*\b(afford|buy)\b",
    "family": r"\b(wife|husband|spouse|kids?|children|child|parents|dependants?|dependents?|family)\b",
    "portfolio": r"\b(portfolio|holdings|rebalance|allocation|diversif\w+)\b",
    "behaviour": r"\b(habit|procrastinat\w+|discipline|scared|stress(ed)?|anxious|impulse|overspend\w*)\b",
}


def classify_intents(text: str) -> list[str]:
    t = text.lower()
    found = [k for k, pat in INTENT_PATTERNS.items() if re.search(pat, t)]
    return found or ["general_health"]
