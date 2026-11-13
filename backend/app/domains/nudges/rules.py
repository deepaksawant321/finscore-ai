"""Daily Companion rules: pure functions from a snapshot of the user's state to nudge candidates. No I/O, no LLM.
Thresholds are Rulebook placeholders (PENDING). Each nudge is ONE message with ONE action and says why it is shown."""

from dataclasses import dataclass
from decimal import Decimal

PRIORITIES = ("critical", "high", "medium", "low", "habit")  # FR-COMP-01
RULES = ("action_next", "action_waiting", "action_stalled", "goal_deadline", "stale_fact", "score_moved", "data_gap")


@dataclass(frozen=True)
class FactInfo:
    id: str
    key: str
    label: str
    age_days: int


@dataclass(frozen=True)
class ActionInfo:
    id: str
    key: str
    title: str
    state: str
    urgency: str
    priority_total: Decimal
    expected_delta: Decimal
    why: str
    verify_label: str
    idle_days: int


@dataclass(frozen=True)
class GoalInfo:
    id: str
    name: str
    days_left: int


@dataclass(frozen=True)
class ScoreInfo:
    run_id: str
    overall: Decimal
    previous: Decimal | None
    early_estimate: bool
    official: bool
    missing_labels: tuple[str, ...]


@dataclass(frozen=True)
class Snapshot:
    facts: tuple[FactInfo, ...] = ()
    actions: tuple[ActionInfo, ...] = ()
    goals: tuple[GoalInfo, ...] = ()
    score: ScoreInfo | None = None


@dataclass(frozen=True)
class Candidate:
    rule: str
    dedupe_key: str
    priority: str
    title: str
    body: str  # includes the reason it is being shown
    cta_label: str
    cta_path: str


def _pts(d: Decimal) -> str:
    return str(d.quantize(Decimal("1"), rounding="ROUND_HALF_UP"))


def evaluate(snap: Snapshot, t: dict[str, int]) -> list[Candidate]:
    out: list[Candidate] = []

    open_actions = sorted((a for a in snap.actions if a.state == "suggested"), key=lambda a: (-a.priority_total, a.key))
    if open_actions:  # only the single best one: one message, one action
        a = open_actions[0]
        out.append(Candidate(
            "action_next", f"action_next:{a.key}", "high" if a.urgency == "high" else "medium", f"Next step: {a.title}",
            f"{a.why} By the scoring rules this could change your score by about {_pts(a.expected_delta)} points.",
            "See the action", "/app/actions",
        ))  # fmt: skip

    for a in snap.actions:
        if a.state == "completed":
            out.append(Candidate("action_waiting", f"action_waiting:{a.id}", "medium", f"Update your numbers for \"{a.title}\"",
                                 f"You marked this done, but your {a.verify_label.lower()} does not show it yet. Update it so I can verify the result.",
                                 "Update my numbers", "/app/memory"))  # fmt: skip
        elif a.state in ("accepted", "in_progress") and a.idle_days >= t["stalled_action_days"]:
            out.append(Candidate("action_stalled", f"action_stalled:{a.id}", "low", f"Still working on \"{a.title}\"?",
                                 f"You accepted this {a.idle_days} days ago and nothing has changed. Mark progress, or skip it if it no longer fits.",
                                 "Review the action", "/app/actions"))  # fmt: skip

    for g in snap.goals:
        if 0 < g.days_left <= t["goal_deadline_days"]:
            urgent = g.days_left <= t["goal_urgent_days"]
            out.append(Candidate("goal_deadline", f"goal_deadline:{g.id}", "high" if urgent else "medium", f"\"{g.name}\" is {g.days_left} days away",
                                 "Its target date is close. Check the funding with your own assumptions and adjust if needed.",
                                 "Open my goals", "/app/goals"))  # fmt: skip

    if snap.facts:  # the single stalest fact, so one nudge never becomes a list of chores
        f = max(snap.facts, key=lambda x: (x.age_days, x.key))
        if f.age_days >= t["stale_fact_days"]:
            out.append(Candidate("stale_fact", f"stale_fact:{f.key}:{f.id}", "low", f"Is your {f.label.lower()} still right?",
                                 f"You last updated it {f.age_days} days ago. Fresh numbers keep your score honest.",
                                 "Review my details", "/app/memory"))  # fmt: skip

    s = snap.score
    if s is not None:
        if s.previous is not None and abs(s.overall - s.previous) >= t["score_move_points"]:
            direction = "up" if s.overall > s.previous else "down"
            demo = "" if s.official else " (demo rules)"
            out.append(Candidate("score_moved", f"score_moved:{s.run_id}", "medium", f"Your score moved {direction}",
                                 f"It went from {_pts(s.previous)} to {_pts(s.overall)}{demo}. See which areas changed.",
                                 "Why did it change?", "/app/score"))  # fmt: skip
        if s.early_estimate and s.missing_labels:
            labels = ", ".join(s.missing_labels[:3])
            out.append(Candidate("data_gap", "data_gap:" + "|".join(sorted(s.missing_labels)), "low", "A few details would sharpen your score",
                                 f"My confidence is low because I don't know: {labels}. Telling me takes a minute.",
                                 "Add details", "/app/interview"))  # fmt: skip
    return out
