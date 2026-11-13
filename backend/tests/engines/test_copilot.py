from decimal import Decimal

from app.engines import copilot as cp
from app.engines.actions import Change

T = cp.Thresholds(Decimal("0.05"), Decimal("0.30"))
D = Decimal


def test_affordability_is_silent_when_an_input_is_unknown() -> None:
    assert cp.affordability(None, D(1000), T) is None
    assert cp.affordability(D(1000), None, T) is None


def test_affordability_blocks_a_deficit() -> None:
    f = cp.affordability(D(100000), D(120000), T)
    assert f is not None and f.level == "blocker" and f.code == "deficit"
    assert "₹20,000" in f.message and f.hand_off is False


def test_affordability_warns_on_a_thin_margin() -> None:
    f = cp.affordability(D(100000), D(96000), T)  # margin 4,000 = 4% < 5% threshold
    assert f is not None and f.level == "warning" and f.code == "thin_margin"


def test_affordability_is_fine_with_healthy_margin() -> None:
    f = cp.affordability(D(100000), D(70000), T)
    assert f is not None and f.level == "ok" and f.code == "affordable"


def test_boundary_exactly_at_thin_margin_ratio_counts_as_thin() -> None:
    f = cp.affordability(D(100000), D(95000), T)  # margin exactly 5%
    assert f is not None and f.level == "warning"


def test_large_cut_in_savings_rate_action_is_flagged() -> None:
    change = Change("target_savings_rate", "monthly_expenses")
    out = cp.action_notes(change, D(150000), D(100000), T)  # 33% cut
    assert len(out) == 1 and out[0].code == "large_cut" and "33%" in out[0].message and out[0].hand_off is False


def test_small_cut_is_not_flagged() -> None:
    change = Change("target_savings_rate", "monthly_expenses")
    assert cp.action_notes(change, D(150000), D(140000), T) == []  # ~7% cut


def test_unknown_values_produce_no_savings_rate_note() -> None:
    change = Change("target_savings_rate", "monthly_expenses")
    assert cp.action_notes(change, None, D(100000), T) == []


def test_debt_ratio_change_always_needs_a_lender() -> None:
    out = cp.action_notes(Change("target_debt_ratio", "monthly_emi_total"), D(60000), D(40000), T)
    assert [o.code for o in out] == ["needs_lender"] and out[0].hand_off is False


def test_multiple_of_change_is_explained_as_a_target() -> None:
    out = cp.action_notes(Change("multiple_of", "liquid_assets", of="monthly_expenses"), D(100000), D(900000), T)
    assert [o.code for o in out] == ["target_not_immediate"]


def test_insurance_flag_change_is_a_hand_off() -> None:
    for field in cp.INSURANCE_FIELDS:
        out = cp.action_notes(Change("set", field, value=True), False, True, T)
        assert [o.code for o in out] == ["product_choice"] and out[0].hand_off is True


def test_non_insurance_set_change_has_no_note() -> None:
    assert cp.action_notes(Change("set", "home_ownership", value="own"), "rent", "own", T) == []
