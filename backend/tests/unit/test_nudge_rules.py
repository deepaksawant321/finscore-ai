from decimal import Decimal

from app.domains.nudges.rules import PRIORITIES, ActionInfo, FactInfo, GoalInfo, ScoreInfo, Snapshot, evaluate
from app.rulebook.loader import load_rulebook

T = load_rulebook().nudge_thresholds()
D = Decimal


def act(key: str, state: str = "suggested", total: str = "50", urgency: str = "medium", idle: int = 0) -> ActionInfo:
    return ActionInfo(
        f"id-{key}", key, key.title(), state, urgency, D(total), D("12"), "Because it matters.", "Liquid savings", idle
    )


def rules_of(snap: Snapshot) -> list[str]:
    return [c.rule for c in evaluate(snap, T)]


def test_nothing_to_say_means_no_nudges() -> None:
    assert evaluate(Snapshot(), T) == []


def test_only_the_single_best_suggested_action_is_nudged() -> None:
    out = evaluate(Snapshot(actions=(act("a", total="40"), act("b", total="80", urgency="high"), act("c", total="60"))), T)
    assert [c.rule for c in out] == ["action_next"] and out[0].dedupe_key == "action_next:b" and out[0].priority == "high"
    assert "12 points" in out[0].body and out[0].cta_path == "/app/actions"  # one message, one action, with the reason


def test_completed_and_stalled_actions() -> None:
    snap = Snapshot(
        actions=(
            act("done", state="completed"),
            act("slow", state="in_progress", idle=T["stalled_action_days"]),
            act("fresh", state="accepted", idle=T["stalled_action_days"] - 1),
        )
    )
    assert sorted(rules_of(snap)) == ["action_stalled", "action_waiting"]
    waiting = next(c for c in evaluate(snap, T) if c.rule == "action_waiting")
    assert "liquid savings" in waiting.body and waiting.cta_path == "/app/memory"


def test_goal_deadline_window_and_urgency() -> None:
    def prio(days: int) -> list[str]:
        return [c.priority for c in evaluate(Snapshot(goals=(GoalInfo("g", "House", days),)), T)]

    assert prio(0) == [] and prio(T["goal_deadline_days"] + 1) == []  # not started / too far away
    assert prio(T["goal_deadline_days"]) == ["medium"] and prio(T["goal_urgent_days"]) == ["high"]


def test_only_the_stalest_fact_is_nudged_and_only_past_the_window() -> None:
    old = FactInfo("f1", "annual_income", "Household annual income", T["stale_fact_days"] + 40)
    older = FactInfo("f2", "monthly_expenses", "Monthly expenses", T["stale_fact_days"] + 90)
    fresh = FactInfo("f3", "age", "Age", 3)
    out = evaluate(Snapshot(facts=(old, older, fresh)), T)
    assert [c.dedupe_key for c in out] == ["stale_fact:monthly_expenses:f2"] and out[0].priority == "low"
    assert evaluate(Snapshot(facts=(FactInfo("f", "age", "Age", T["stale_fact_days"] - 1),)), T) == []


def test_score_moved_needs_a_material_change_and_names_direction() -> None:
    def s(now: str, before: str | None) -> Snapshot:
        return Snapshot(score=ScoreInfo("r1", D(now), None if before is None else D(before), False, False, ()))

    assert evaluate(s("600", None), T) == [] and evaluate(s("610", "600"), T) == []
    up = evaluate(s("640", "600"), T)[0]
    assert up.rule == "score_moved" and "moved up" in up.title and "demo rules" in up.body
    assert "moved down" in evaluate(s("560", "600"), T)[0].title


def test_data_gap_only_for_early_estimates_with_known_missing_details() -> None:
    low = Snapshot(score=ScoreInfo("r", D(500), None, True, False, ("Liquid savings", "Age")))
    assert rules_of(low) == ["data_gap"]
    assert rules_of(Snapshot(score=ScoreInfo("r", D(500), None, False, False, ("Age",)))) == []  # confident score: stay quiet
    assert rules_of(Snapshot(score=ScoreInfo("r", D(500), None, True, False, ()))) == []


def test_priorities_are_valid_and_dedupe_keys_unique() -> None:
    snap = Snapshot(
        facts=(FactInfo("f", "age", "Age", 999),), actions=(act("a"), act("b", state="completed")), goals=(GoalInfo("g", "Car", 10),),
        score=ScoreInfo("r", D(700), D(600), True, False, ("Age",)),
    )  # fmt: skip
    out = evaluate(snap, T)
    assert all(c.priority in PRIORITIES for c in out) and len({c.dedupe_key for c in out}) == len(out) == 6
