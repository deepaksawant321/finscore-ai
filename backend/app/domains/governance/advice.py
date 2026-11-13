"""Advice classification and the regulated-request guard (blueprint section 23).

STATUS: the regulatory perimeter (education vs advice, SEBI IA/RA registration) is PENDING Legal/Compliance approval (D-B9).
Until it is approved the safe default is: never show output classified `regulated`, and decline questions that ask for it.
These are keyword baselines — deterministic and testable, NOT a legal determination.
"""

import re
from typing import Literal

AdviceClass = Literal["education", "information", "planning", "recommendation", "regulated"]
BLOCKED_CLASSES: frozenset[str] = frozenset({"regulated"})
POLICY_STATUS = "PENDING PRODUCT/LEGAL APPROVAL (D-B9): regulated-class output is blocked by default"

_REGULATED_OUTPUT = re.compile(
    r"guaranteed\s+(returns?|profits?|income)|\b(you should|i recommend|i suggest|go ahead and)\s+(buy|sell|hold|short)\b"
    r"|\b(buy|sell)\s+(shares?|stocks?|units?)\s+of\b|\bbest (stock|mutual fund|fund|crypto|coin)s? to (buy|invest)\b",
    re.IGNORECASE,
)
_RECOMMENDATION = re.compile(
    r"\b(you should|i recommend|i suggest|consider (buying|investing|switching|increasing|reducing)|you ought to)\b",
    re.IGNORECASE,
)
_PLANNING = re.compile(r"\b(projected|projection|your plan|goal|corpus|required|runway|on track|shortfall)\b", re.IGNORECASE)
_EDUCATION = re.compile(r"^(what is|what are|how does|why do|explain|means)\b|\bis a (type|kind) of\b", re.IGNORECASE)

_REGULATED_ASK = [
    re.compile(r"\bshould i (buy|sell|hold|short)\b", re.IGNORECASE),
    re.compile(
        r"\b(which|what)\b.{0,40}\b(stocks?|shares?|mutual funds?|funds?|crypto|coins?|etfs?|ipos?)\b.{0,40}\b(buy|invest|pick|best|sell)\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"\bguaranteed\s+(returns?|profits?)\b|\b(sure[- ]shot|risk[- ]free)\s+(returns?|profits?|tips?)\b", re.IGNORECASE
    ),
    re.compile(r"\b(stock|market|trading)\s+tips?\b|\bgive me (a )?tips?\b", re.IGNORECASE),
    re.compile(r"\bbest\s+(stock|fund|sip|crypto|coin)s?\s+(to|for)\b", re.IGNORECASE),
]
_DISTRESS = re.compile(r"\b(suicid\w*|end my life|kill myself|can'?t go on|no way out|want to die|self[- ]harm)\b", re.IGNORECASE)

SAFE_DECLINE = (
    "I can't recommend specific stocks, funds or products, or promise returns — that needs a qualified human adviser. "
    "I can explain how things work, show your numbers, and run what-if calculations. "
    "If you'd like, I can ask a person on our team to review your question."
)
DISTRESS_RESPONSE = (
    "I'm really sorry you're going through this. I'm an AI and can't give you the support you deserve right now. "
    "Please talk to someone you trust or a local helpline (in India, Tele-MANAS: 14416). "
    "I've also flagged this so a person from our team can reach out."
)


def classify_output(text: str) -> AdviceClass:
    if _REGULATED_OUTPUT.search(text):
        return "regulated"
    if _RECOMMENDATION.search(text):
        return "recommendation"
    if _PLANNING.search(text):
        return "planning"
    if _EDUCATION.search(text.strip()):
        return "education"
    return "information"


def asks_for_regulated_advice(user_text: str) -> bool:
    return any(p.search(user_text) for p in _REGULATED_ASK)


def indicates_distress(user_text: str) -> bool:
    return bool(_DISTRESS.search(user_text))
