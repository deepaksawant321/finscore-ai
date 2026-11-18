"""Deterministic coach router: user message -> (mode, tools). English keyword baseline (like the advice guard, K-24), tested
and reproducible. The LLM never chooses tools. Modes follow AI_ARCHITECTURE: explain, diagnose, simulate, act."""

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class Route:
    mode: str  # explain | diagnose | simulate | act | other
    tools: tuple[str, ...]


# Order matters: the first matching rule wins. Act and Simulate come first so "what should I do" is never answered as Explain.
_RULES: list[tuple[re.Pattern[str], Route]] = [
    (
        re.compile(
            r"\b(what should i (do|fix|change)|how (do|can) i (improve|raise|increase|boost)|next (step|action)|improve my score)\b",
            re.I,
        ),
        Route("act", ("act", "explain_score")),
    ),
    (
        re.compile(
            r"\b(on track|goal|goals)\b.*\b(assum|return|inflation|%)|\b(assum\w*|inflation)\b.*\b(goal|on track)\b", re.I
        ),
        Route("simulate", ("goal_status",)),
    ),
    (
        re.compile(
            r"\b(what if|simulate|scenario|how long (will|would) it take|if i (invest|save|cut|reduce|lower|spend))\b", re.I
        ),
        Route("simulate", ("what_if",)),
    ),
    (re.compile(r"\b(on track|how is my goal|goal status|check my goal)\b", re.I), Route("simulate", ("goal_status",))),
    (re.compile(r"\b(my goals|list goals|what goals)\b", re.I), Route("diagnose", ("goals_overview",))),
    # "why is my score 607?" asks what the score means, not why it changed
    (
        re.compile(r"\b(why|how come) (is|'s) my (fin)?score\b|\bwhat does my (fin)?score mean\b", re.I),
        Route("explain", ("explain_score",)),
    ),
    (
        re.compile(
            r"\b(why|what changed|changed|go up|went up|go down|went down|dropped|increase[d]?|decrease[d]?)\b.*\bscore\b|\bscore\b.*\b(change|changed|dropped)\b",
            re.I,
        ),
        Route("explain", ("score_change",)),
    ),
    (re.compile(r"\b(stage|stages|level|bands?)\b", re.I), Route("explain", ("stage_info",))),
    (
        re.compile(r"\b(weak\w*|strength\w*|hold(ing)? me back|driver\w*|explain|breakdown|what makes|what affects)\b", re.I),
        Route("explain", ("explain_score",)),
    ),
    (
        re.compile(
            r"\b(missing|gap|gaps|what (do you|data|information)|what else|coverage|more information|still need|need from me|raise.*confidence)\b",
            re.I,
        ),
        Route("diagnose", ("missing_data",)),
    ),
    (
        re.compile(r"\b(what do you know|my (profile|facts|details|data)|what have you saved|saved about me)\b", re.I),
        Route("diagnose", ("profile_summary",)),
    ),
    (re.compile(r"\b(score|finscore|how am i doing|where do i stand)\b", re.I), Route("explain", ("get_score", "explain_score"))),
]

CAPABILITIES = (
    "I can explain your score and what drives it, show why it changed, show what information is missing, "
    "summarise what I've saved, and check a goal using assumptions you give me."
)


def route(text: str) -> Route:
    for pat, r in _RULES:
        if pat.search(text):
            return r
    return Route("other", ())
