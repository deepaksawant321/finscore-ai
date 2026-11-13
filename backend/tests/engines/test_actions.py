from decimal import Decimal

from app.engines import actions as a
from app.engines.money import D
from app.rulebook.loader import load_rulebook

RB = load_rulebook()
SPECS = {s.key: s for s in RB.action_specs()}
CFG = RB.priority_config()


def test_conditions_never_treat_unknown_as_true_or_false() -> None:
    c = a.Cond("emergency_months", "lt", D(6))
    assert c.holds({"emergency_months": D(2)}) is True
    assert c.holds({"emergency_months": D(6)}) is False
    assert c.holds({"emergency_months": None}) is None and c.holds({}) is None
    flag = a.Cond("has_health_insurance", "eq", False)
    assert flag.holds({"has_health_insurance": False}) is True and flag.holds({"has_health_insurance": True}) is False
    assert flag.holds({}) is None


def test_actions_are_offered_only_when_the_gap_is_known() -> None:
    sp = SPECS["arrange_health_insurance"]
    assert a.applicable(sp, {"has_health_insurance": False}) and not a.applicable(sp, {"has_health_insurance": True})
    assert not a.applicable(sp, {})  # unknown is a question for the interview, not an action


def test_proposed_changes_per_kind() -> None:
    inputs = {
        "monthly_income": D(200000),
        "monthly_expenses": D(150000),
        "liquid_assets": D(100000),
        "monthly_emi_total": D(80000),
    }
    assert a.proposed_change(SPECS["build_emergency_fund"], inputs) == {"liquid_assets": D(900000)}  # 6 x monthly expenses
    assert a.proposed_change(SPECS["raise_savings_rate"], inputs) == {"monthly_expenses": D(140000)}  # income x (1 - 30%)
    assert a.proposed_change(SPECS["lower_emi_burden"], inputs) == {"monthly_emi_total": D(50000)}  # income x 25%
    assert a.proposed_change(SPECS["arrange_term_insurance"], inputs) == {"has_term_insurance": True}
    assert a.proposed_change(SPECS["build_emergency_fund"], {}) is None  # needed inputs unknown


def test_is_done_matches_the_gap_definition() -> None:
    sp = SPECS["raise_savings_rate"]
    assert not a.is_done(sp, {"savings_rate": D("0.10")}) and a.is_done(sp, {"savings_rate": D("0.30")})
    assert not a.is_done(sp, {})


def cand(key: str, delta: str, rupees: str = "0", conf: str = "1", goal: bool = False) -> a.Candidate:
    return a.Candidate(SPECS[key], {}, D(delta), D(rupees), D(conf), goal)


def test_priority_is_relative_bounded_and_deterministic() -> None:
    cs = [
        cand("build_emergency_fund", "40", "600000"),
        cand("arrange_health_insurance", "20"),
        cand("raise_savings_rate", "10", "120000", goal=True),
    ]
    ranked = a.prioritise(cs, CFG)
    assert [c.spec.key for c, _ in ranked] == [c.spec.key for c, _ in a.prioritise(list(reversed(cs)), CFG)]  # order-independent
    top, bd = ranked[0]
    assert (
        top.spec.key == "build_emergency_fund"
        and bd.impact == CFG.weights["impact"]
        and bd.financial_impact == CFG.weights["financial_impact"]
    )
    for _, b in ranked:
        assert b.total <= sum(CFG.weights.values()) and all(
            v >= 0 for v in (b.impact, b.financial_impact, b.urgency, b.ease, b.confidence, b.goal_alignment)
        )
    by = {c.spec.key: b for c, b in ranked}
    assert by["raise_savings_rate"].goal_alignment == CFG.weights["goal_alignment"]  # supports goals and the user has one
    assert by["arrange_health_insurance"].goal_alignment == 0 and by["arrange_health_insurance"].financial_impact == 0


def test_actions_without_a_computed_score_effect_are_not_offered() -> None:
    assert a.prioritise([cand("build_emergency_fund", "0"), cand("raise_savings_rate", "-3")], CFG) == []


def test_low_input_confidence_lowers_the_confidence_points() -> None:
    hi = dict((c.spec.key, b) for c, b in a.prioritise([cand("build_emergency_fund", "5", conf="1")], CFG))
    lo = dict((c.spec.key, b) for c, b in a.prioritise([cand("build_emergency_fund", "5", conf="0.5")], CFG))
    assert lo["build_emergency_fund"].confidence == hi["build_emergency_fund"].confidence / 2


def test_max_actions_and_tie_break_by_key() -> None:
    cs = [cand(k, "10") for k in SPECS]
    out = a.prioritise(cs, a.PriorityConfig(CFG.weights, CFG.urgency_points, CFG.ease_points, 2))
    assert len(out) == 2
    assert Decimal(0) <= out[0][1].total
    same = a.prioritise([cand("arrange_health_insurance", "5"), cand("arrange_term_insurance", "5")], CFG)
    assert same[0][1].total >= same[1][1].total
