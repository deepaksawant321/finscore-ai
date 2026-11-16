"""Tests for the workbook-derived FinScore engine. Expected numbers come from the business workbooks' saved values
(MasterSheet of FinScore.xlsx, Corporate client scoring.xlsx, Retirement new1.xlsm) - see docs/rules/FINSCORE_RULES_SPEC.md."""

from decimal import Decimal
from pathlib import Path

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from app.engines.finmath import goal_plan, human_life_value, payment_for_future_value, pv_annuity_due, retirement_plan
from app.engines.matrix_score import (
    MatrixInputs,
    age_band_index,
    compute_matrix_score,
    lookup,
    points_from_factor_scores,
    risk_profile,
    value_band_index,
)
from app.engines.money import D
from app.rulebook.matrix_rules import VERSIONS_DIR, load_matrix_spec

SPEC = load_matrix_spec()
TOL = D("0.01")


def close(a: Decimal, b: str, tol: Decimal = TOL) -> bool:
    return abs(a - D(b)) <= tol


# ---------------------------------------------------------------------------------------------- the rule set


def test_rule_set_is_a_draft_and_never_official() -> None:
    assert SPEC.official is False and "NOT OFFICIAL" in SPEC.rule_set


def test_spec_shape() -> None:
    assert SPEC.total_weight == 100 and len(SPEC.factors) == 15 and SPEC.scale_max == 900
    assert len(SPEC.matrices) == 17 and len(SPEC.age_upper) == 7 and SPEC.age_upper[-1] is None
    assert [f.id for f in SPEC.factors] == [f"F{i:02d}" for i in range(1, 16)]
    assert all(0 <= c <= 10 for m in SPEC.matrices.values() for row in m.rows for c in row)


def test_docs_copy_is_identical_to_rulebook_copy() -> None:
    docs = Path(__file__).resolve().parents[3] / "docs" / "rules" / "finscore_rules.json"
    if not docs.exists():
        pytest.skip("docs/ not present (e.g. Docker image)")
    mine = VERSIONS_DIR / "matrix-0.1.0-draft" / "matrix_rules.json"
    assert docs.read_bytes() == mine.read_bytes(), "re-copy docs/rules/finscore_rules.json into the rulebook folder"


# ---------------------------------------------------------------------------------------------- lookup


@pytest.mark.parametrize(
    ("age", "band"),
    [
        (0, 0),
        (18, 0),
        (25, 0),
        (26, 1),
        (30, 1),
        (31, 2),
        (35, 2),
        (36, 3),
        (40, 3),
        (41, 4),
        (50, 4),
        (51, 5),
        (60, 5),
        (61, 6),
        (99, 6),
    ],
)
def test_age_bands(age: int, band: int) -> None:
    assert age_band_index(SPEC, age) == band


def test_age_out_of_range() -> None:
    for bad in (-1, 121):
        with pytest.raises(ValueError, match="age"):
            age_band_index(SPEC, bad)


def test_boundary_values_fall_in_the_higher_band() -> None:
    m = SPEC.matrices["cashflow"]  # cuts 30,40,...
    assert value_band_index(m, D("29.99")) == 0
    assert value_band_index(m, D(30)) == 1
    assert value_band_index(m, D(80)) == 6 and value_band_index(m, D("100")) == 6


def test_zero_exact_matrices_give_zero_its_own_band() -> None:
    foir = SPEC.matrices["foir"]
    assert (
        value_band_index(foir, D(0)),
        value_band_index(foir, D("0.5")),
        value_band_index(foir, D(20)),
        value_band_index(foir, D(61)),
    ) == (0, 1, 2, 6)
    pa = SPEC.matrices["portfolio_allocation"]
    assert (value_band_index(pa, D(0)), value_band_index(pa, D(1)), value_band_index(pa, D(100))) == (0, 1, 5)
    d80 = SPEC.matrices["tax_80d"]
    assert (value_band_index(d80, D(0)), value_band_index(d80, D(9)), value_band_index(d80, D(26))) == (0, 1, 5)


def test_lookup_matches_workbook_cells() -> None:
    assert lookup(SPEC, "cashflow", 28, D(25)) == (4, "Less than 30%")
    assert lookup(SPEC, "savings", 28, D(25)) == (6, "20-30%")
    assert lookup(SPEC, "income_range", 28, D(4)) == (6, "2.5 to 5 lakhs")
    assert lookup(SPEC, "health_dep1_2", 39, D(15))[0] == 10  # 36-40, 15-20 lakh, up to 2 dependants
    assert lookup(SPEC, "portfolio_allocation", 28, D(100)) == (9, "81.01-100%")  # the inverted peak is in the source matrix
    assert lookup(SPEC, "kids_goals", 40, D(0))[0] == 10 and lookup(SPEC, "kids_goals", 40, D(1))[0] == 0


# ---------------------------------------------------------------------------------------------- score arithmetic


def test_max_points_follow_weights_and_sum_to_900() -> None:
    inputs = MatrixInputs(age=30, monthly_income=D(100_000))
    r = compute_matrix_score(SPEC, inputs)
    assert sum((f.max_points for f in r.factors), D(0)) == 900
    assert {f.id: f.max_points for f in r.factors}["F01"] == 90  # weight 10 x 9


def test_reproduces_master_workbook_total_417_6() -> None:
    manual = dict(zip((f"F{i:02d}" for i in range(1, 16)), (4, 6, 5, 5, 0, 6, 5, 9, 10, 4, 5, 5, 5, 0, 0), strict=True))
    assert points_from_factor_scores(SPEC, manual) == D("417.6")


def test_reproduces_corporate_workbook_total_535_5() -> None:
    manual = dict(zip((f"F{i:02d}" for i in range(1, 16)), (10, 10, *([5] * 13)), strict=True))
    assert points_from_factor_scores(SPEC, manual) == D("535.5")


# ---------------------------------------------------------------------------------------------- end to end


MASTER_SAMPLE = MatrixInputs(
    age=28, monthly_income=D(40_000), monthly_expenses=D(30_000), total_emi=D(0), loans_outstanding=D(0), equity=D(900), debt=D(0),
    other_assets=D(0), monthly_investments=D(0), pending_goals=4, life_cover=D(0), health_cover=D(0), dependants=0, kids=0,
    section_80c=D(0), section_80d=D(0), retirement_age=60, life_expectancy=80, risk_profile="BALANCED",
)  # fmt: skip


def test_master_sample_factor_scores_match_the_workbook_inputs() -> None:
    """The workbook's 'points scored by client' column is hand-entered. The matrices reproduce it for every factor except
    F05 (workbook typed 0; matrix gives 9) and F15 (workbook typed 0; engine treats no-kids as not applicable)."""
    r = compute_matrix_score(SPEC, MASTER_SAMPLE)
    got = {f.id: f.factor_score for f in r.factors}
    assert got == {
        "F01": 4, "F02": 6, "F03": 5, "F04": 5, "F05": 9, "F06": 6, "F07": 5, "F08": 9, "F09": 10, "F10": 4,
        "F11": 5, "F12": 5, "F13": 5, "F14": 0, "F15": None,
    }  # fmt: skip
    f15 = next(f for f in r.factors if f.id == "F15")
    assert f15.status == "not_applicable"
    assert r.confidence == D("0.95")
    assert r.overall is not None and D(0) < r.overall < D(900)
    # rescaled total = 900 * earned / max of scored factors
    assert r.overall == D(900) * r.raw_points / r.max_points_scored
    assert r.official is False and "NOT OFFICIAL" in r.rule_set


def test_every_scored_factor_explains_itself() -> None:
    r = compute_matrix_score(SPEC, MASTER_SAMPLE)
    for f in r.factors:
        assert f.reason and f.id and f.name
        if f.status == "scored":
            assert f.points is not None and f.ratio is not None and f.band_label


def test_missing_inputs_lower_confidence_and_are_never_scored_as_zero() -> None:
    full = compute_matrix_score(SPEC, MASTER_SAMPLE)
    partial = compute_matrix_score(SPEC, MatrixInputs(age=28, monthly_income=D(40_000), monthly_expenses=D(30_000)))
    assert partial.confidence < full.confidence
    by = {f.id: f for f in partial.factors}
    assert by["F01"].status == "scored" and by["F06"].status == "scored"
    assert by["F09"].status == "missing" and by["F09"].missing_inputs == ("total_emi",)
    assert by["F09"].factor_score is None
    assert partial.overall is not None  # scored factors still produce a (lower-confidence) result
    assert any("confidence" in n for n in partial.notes)


def test_income_only_scores_just_income_range() -> None:
    r = compute_matrix_score(SPEC, MatrixInputs(age=30, monthly_income=D(50_000)))
    assert [f.id for f in r.factors if f.status == "scored"] == ["F06"]
    assert r.confidence == D("0.07")


def test_kids_factor() -> None:
    base = {"age": 35, "monthly_income": D(80_000)}
    with_kids = compute_matrix_score(SPEC, MatrixInputs(**base, kids=2, kids_goal_planned=False))  # type: ignore[arg-type]
    f15 = next(f for f in with_kids.factors if f.id == "F15")
    assert f15.status == "scored" and f15.factor_score == 0
    unknown = compute_matrix_score(SPEC, MatrixInputs(**base, kids=2))  # type: ignore[arg-type]
    assert next(f for f in unknown.factors if f.id == "F15").status == "missing"


def test_health_matrix_is_chosen_by_dependants() -> None:
    def hs(dep: int) -> int | None:
        r = compute_matrix_score(SPEC, MatrixInputs(age=30, monthly_income=D(50_000), health_cover=D(500_000), dependants=dep))
        return next(f for f in r.factors if f.id == "F12").factor_score

    assert (hs(0), hs(1), hs(2), hs(3), hs(5)) == (10, 9, 9, 8, 8)  # 26-30, 5-10 lakh cover


def test_zero_equity_and_debt_makes_allocation_not_applicable() -> None:
    r = compute_matrix_score(SPEC, MatrixInputs(age=30, monthly_income=D(50_000), equity=D(0), debt=D(0)))
    assert next(f for f in r.factors if f.id == "F05").status == "not_applicable"


def test_no_surplus_scores_retirement_readiness_in_lowest_band() -> None:
    r = compute_matrix_score(SPEC, MatrixInputs(age=30, monthly_income=D(50_000), monthly_expenses=D(50_000)))
    f08 = next(f for f in r.factors if f.id == "F08")
    assert f08.status == "scored" and f08.band_label == "More than 200%" and f08.factor_score == 5


def test_retirement_age_not_after_current_age_is_handled_without_crashing() -> None:
    r = compute_matrix_score(SPEC, MatrixInputs(age=62, monthly_income=D(50_000), monthly_expenses=D(30_000), retirement_age=60))
    assert next(f for f in r.factors if f.id == "F08").band_label == "More than 200%"


def test_savings_formula_option() -> None:
    from dataclasses import replace

    inp = MatrixInputs(
        age=30, monthly_income=D(100_000), monthly_expenses=D(40_000), total_emi=D(10_000), monthly_investments=D(30_000)
    )
    deduct = next(f for f in compute_matrix_score(SPEC, inp).factors if f.id == "F02")
    keep = next(f for f in compute_matrix_score(replace(SPEC, savings_deducts_investments=False), inp).factors if f.id == "F02")
    assert deduct.value == D(20) and keep.value == D(50)  # Master vs Corporate formula


def test_invalid_income_is_rejected() -> None:
    for bad in (D(0), D(-1)):
        with pytest.raises(ValueError, match="monthly_income"):
            compute_matrix_score(SPEC, MatrixInputs(age=30, monthly_income=bad))


def test_score_message_bands() -> None:
    def msg(points: int) -> str | None:
        return next(t for lo, t in reversed(SPEC.messages) if D(points) >= lo)

    assert "urgent" in msg(400) and "doing well" in msg(500) and "maintain" in msg(700)


def test_floats_are_rejected_at_the_boundary() -> None:
    with pytest.raises(TypeError):
        D(0.1)


def test_deterministic() -> None:
    assert compute_matrix_score(SPEC, MASTER_SAMPLE) == compute_matrix_score(SPEC, MASTER_SAMPLE)


money = st.decimals(min_value=0, max_value=50_000_000, allow_nan=False, allow_infinity=False, places=0)


@settings(max_examples=150, deadline=None)
@given(
    age=st.integers(18, 90), income=st.decimals(min_value=1, max_value=5_000_000, places=0),
    expenses=money, emi=money, inv=money, equity=money, debt=money, other=money, loans=money, life=money, health=money,
    goals=st.integers(0, 12), deps=st.integers(0, 8), c80=money, d80=money,
)  # fmt: skip
def test_score_invariants(
    age, income, expenses, emi, inv, equity, debt, other, loans, life, health, goals, deps, c80, d80
) -> None:  # type: ignore[no-untyped-def]
    r = compute_matrix_score(
        SPEC,
        MatrixInputs(
            age=age, monthly_income=income, monthly_expenses=expenses, total_emi=emi, monthly_investments=inv, equity=equity, debt=debt,
            other_assets=other, loans_outstanding=loans, life_cover=life, health_cover=health, pending_goals=goals, dependants=deps,
            kids=0, section_80c=c80, section_80d=d80,
        ),
    )  # fmt: skip
    assert r.overall is not None and D(0) <= r.overall <= D(900)
    assert D(0) < r.confidence <= D(1)
    for f in r.factors:
        if f.status == "scored":
            assert f.points is not None and D(0) <= f.points <= f.max_points
            assert f.factor_score is not None and 0 <= f.factor_score <= 10


# ---------------------------------------------------------------------------------------------- calculators (workbook vectors)


def test_retirement_matches_master_workbook() -> None:
    """Master workbook inputs as saved: age 32, 32 years to retire (retire at 64), life expectancy 80, expense 30,000, Balanced."""
    p = retirement_plan(
        monthly_expense=D(30_000), age=32, retirement_age=64, life_expectancy=80, inflation=SPEC.retirement.inflation,
        annuity_rate=SPEC.retirement.annuity_rate, profile_annual_return=SPEC.risk.annual_return["BALANCED"],
    )  # fmt: skip
    assert close(p.expense_at_retirement_monthly, "352112.49")
    assert close(p.corpus_required, "40560253.60")
    assert close(p.monthly_sip, "4421.33")
    assert close(p.annual_sip, "49625.36")
    assert close(p.one_time, "357959.52")


def test_retirement_matches_goals_sheet() -> None:
    p = retirement_plan(
        monthly_expense=D(800_000) / D(12), age=55, retirement_age=60, life_expectancy=75, inflation=SPEC.retirement.inflation,
        annuity_rate=SPEC.retirement.annuity_rate, profile_annual_return=SPEC.risk.annual_return["BALANCED"],
    )  # fmt: skip
    assert close(p.expense_at_retirement_monthly, "97955.21")
    assert close(p.corpus_required, "10890375.42")
    assert close(p.monthly_sip, "121868.08")
    assert close(p.annual_sip, "1367856.95")
    assert close(p.one_time, "5200722.39")


def test_retirement_savings_reduce_the_corpus_still_to_fund_and_never_go_negative() -> None:
    kwargs = {
        "monthly_expense": D(30_000), "age": 32, "retirement_age": 64, "life_expectancy": 80, "inflation": SPEC.retirement.inflation,
        "annuity_rate": SPEC.retirement.annuity_rate, "profile_annual_return": SPEC.risk.annual_return["BALANCED"],
    }  # fmt: skip
    base = retirement_plan(**kwargs)  # type: ignore[arg-type]
    some = retirement_plan(**kwargs, current_savings=D(1_000_000))  # type: ignore[arg-type]
    huge = retirement_plan(**kwargs, current_savings=D(10_000_000_000))  # type: ignore[arg-type]
    assert (
        some.corpus_after_savings < base.corpus_after_savings and some.monthly_sip_after_savings < base.monthly_sip_after_savings
    )
    assert huge.corpus_after_savings == 0 and huge.monthly_sip_after_savings == 0
    assert some.monthly_sip == base.monthly_sip  # workbook G22 ignores savings; the adjusted figure is separate


def test_retirement_input_validation() -> None:
    base = {
        "monthly_expense": D(1), "inflation": D("0.08"), "annuity_rate": D("0.1593"), "profile_annual_return": D("0.1593"),
    }  # fmt: skip
    with pytest.raises(ValueError, match="retirement_age"):
        retirement_plan(age=60, retirement_age=60, life_expectancy=80, **base)  # type: ignore[arg-type]
    with pytest.raises(ValueError, match="life_expectancy"):
        retirement_plan(age=30, retirement_age=60, life_expectancy=60, **base)  # type: ignore[arg-type]


def test_human_life_value_matches_workbook() -> None:
    need, gap = human_life_value(
        annual_expenses=D(360_000),
        years_to_retirement=32,
        discount_rate=SPEC.retirement.insurance_discount_rate,
        existing_cover=D(0),
    )
    assert close(need, "4445927.78") and gap == need
    _, covered = human_life_value(
        annual_expenses=D(360_000), years_to_retirement=32, discount_rate=D("0.08"), existing_cover=D(10_000_000)
    )
    assert covered == 0


def test_goal_plan_matches_workbook_future_value_calculator() -> None:
    g = goal_plan(amount_today=D(3_000_000), years=5, inflation=D("0.08"), annual_return=D("0.06"))  # UAT conservative rate
    assert close(g.future_value, "4407984.23")
    assert close(g.monthly_saving, "63129.92")
    assert close(g.annual_saving, "737698.62")
    assert close(g.one_time, "3293902.24")


def test_time_value_helpers() -> None:
    assert pv_annuity_due(D(0), 10, D(100)) == 1000
    assert payment_for_future_value(D(0), 10, D(1000)) == 100
    with pytest.raises(ValueError, match="periods"):
        payment_for_future_value(D("0.01"), 0, D(1))


# ---------------------------------------------------------------------------------------------- risk profile


@pytest.mark.parametrize(
    ("answers", "name", "total"),
    [((1, 5, 4, 5, 1, 5, 4), "AGGRESSIVE", 32), ((5, 1, 5, 1, 5, 1, 5), "CONSERVATIVE", 7)],
)
def test_risk_profile_from_answers(answers: tuple[int, ...], name: str, total: int) -> None:
    assert risk_profile(SPEC.risk, answers) == (name, total)


def test_risk_profile_band_boundaries() -> None:
    bands = {n: u for u, n in SPEC.risk.bands}
    assert bands == {
        "CONSERVATIVE": 10,
        "MODERATELY CONSERVATIVE": 16,
        "BALANCED": 25,
        "MODERATELY AGGRESSIVE": 31,
        "AGGRESSIVE": 35,
    }


def test_risk_profile_validation() -> None:
    with pytest.raises(ValueError, match="answers"):
        risk_profile(SPEC.risk, (1, 2, 3))
    with pytest.raises(ValueError, match="range"):
        risk_profile(SPEC.risk, (1, 1, 1, 1, 1, 1, 9))
