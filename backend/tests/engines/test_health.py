from decimal import Decimal

import pytest

from app.engines import health as h
from app.rulebook.loader import load_rulebook

SPECS, FAIR = load_rulebook().health_vitals()
BY = {s.key: s for s in SPECS}
D = Decimal


def st(status: str, known: bool = True, stale: bool = False, value: str | None = "1") -> h.VitalState:
    return h.VitalState(status, known, stale, value if known else None)


@pytest.mark.parametrize(
    ("key", "value", "expected"),
    [
        ("savings_rate", D("0.20"), "green"), ("savings_rate", D("0.1999"), "amber"), ("savings_rate", D("0.10"), "amber"),
        ("savings_rate", D("0.0999"), "red"), ("emergency_cushion", D(6), "green"), ("emergency_cushion", D(3), "amber"),
        ("emergency_cushion", D("2.99"), "red"), ("debt_load", D("0.20"), "green"), ("debt_load", D("0.35"), "amber"),
        ("debt_load", D("0.3501"), "red"), ("health_cover", True, "green"), ("health_cover", False, "red"),
        ("savings_rate", None, "unknown"), ("health_cover", None, "unknown"),
    ],
)  # fmt: skip
def test_thresholds_at_the_boundaries(key: str, value: Decimal | bool | None, expected: str) -> None:
    assert h.vital_status(BY[key], value) == expected


def test_overall_is_the_worst_known_vital_and_ignores_unknowns() -> None:
    assert h.overall_status([st("green"), st("amber"), st("unknown", known=False)]) == "amber"
    assert h.overall_status([st("green"), st("red"), st("amber")]) == "red"
    assert h.overall_status([st("unknown", known=False)]) == "unknown" and h.overall_status([]) == "unknown"


def test_data_quality_is_a_separate_verdict() -> None:
    fresh = [st("green"), st("red")]
    assert h.data_quality(fresh, FAIR) == "good"  # everything measured and fresh, even though health is poor
    five = [st("green"), st("green"), st("green"), st("unknown", known=False), st("unknown", known=False)]
    assert h.data_quality(five, FAIR) == "fair"  # 3 of 5 known = 0.6
    assert h.data_quality([st("green"), st("unknown", known=False), st("unknown", known=False)], FAIR) == "poor"
    assert h.data_quality([st("green", stale=True), st("green", stale=True)], FAIR) == "poor"
    assert h.data_quality([st("green", stale=True), st("green")], FAIR) == "fair"
    assert h.data_quality([], FAIR) == "poor"


def kinds(evs: list[h.HealthEvent]) -> list[tuple[str, str]]:
    return [(e.vital, e.kind) for e in evs]


def test_first_check_has_nothing_to_compare() -> None:
    assert h.classify_changes(None, {"a": st("red")}) == []


def test_a_newly_measured_red_is_not_a_health_decline() -> None:
    evs = h.classify_changes({"a": st("unknown", known=False)}, {"a": st("red")})
    assert kinds(evs) == [("a", "newly_measured")] and not evs[0].is_health_change


def test_real_changes_are_classified_as_health_changes() -> None:
    evs = h.classify_changes(
        {"a": st("green"), "b": st("red"), "c": st("amber")}, {"a": st("red"), "b": st("amber"), "c": st("amber")}
    )
    assert kinds(evs) == [("a", "health_worse"), ("b", "health_better")] and all(e.is_health_change for e in evs)


def test_going_stale_is_a_data_quality_event_not_a_health_change() -> None:
    evs = h.classify_changes({"a": st("amber")}, {"a": st("amber", stale=True)})
    assert kinds(evs) == [("a", "went_stale")] and not evs[0].is_health_change
    assert kinds(h.classify_changes({"a": st("amber", stale=True)}, {"a": st("amber")})) == [("a", "refreshed")]


def test_no_events_when_nothing_changed_and_a_new_vital_is_not_worse() -> None:
    same = {"a": st("green"), "b": st("red")}
    assert h.classify_changes(same, dict(same)) == []
    assert kinds(h.classify_changes({"a": st("green")}, {"a": st("green"), "z": st("red")})) == [("z", "newly_measured")]


def test_headline_never_says_healthy_while_a_vital_is_unmeasured() -> None:
    from app.engines.health import headline_status

    assert headline_status("green", any_unmeasured=True) == "incomplete"
    assert headline_status("unknown", any_unmeasured=True) == "incomplete"
    assert headline_status("green", any_unmeasured=False) == "green"
    assert headline_status("amber", any_unmeasured=True) == "amber"  # a real warning stays a warning
    assert headline_status("red", any_unmeasured=True) == "red"
