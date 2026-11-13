from decimal import Decimal

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from app.engines import cashflow, debt, growth, retirement
from app.engines.money import D, find_amounts, round_money


# ---------- money / parsing ----------
@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("I earn ₹22 lakh annually", Decimal(2_200_000)),
        ("my wife earns around 12 lakhs", Decimal(1_200_000)),
        ("Rs. 1.5 crore home", Decimal(15_000_000)),
        ("₹34L household", Decimal(3_400_000)),
        ("spend 50k a month", Decimal(50_000)),
        ("2,50,000 in FD", Decimal(250_000)),
        ("INR 60 lakh car", Decimal(6_000_000)),
    ],
)
def test_find_amounts_indian_formats(text: str, expected: Decimal) -> None:
    found = find_amounts(text)
    assert found and found[0].value == expected


def test_floats_are_rejected_not_silently_converted() -> None:
    with pytest.raises(TypeError):
        D(0.1)  # type: ignore[arg-type]


def test_round_money_half_up() -> None:
    assert round_money(Decimal("2.345")) == Decimal("2.35")
    assert round_money(Decimal("2.344")) == Decimal("2.34")


# ---------- cashflow ----------
def test_savings_rate_and_surplus() -> None:
    assert cashflow.monthly_surplus(D(100000), D(60000)) == D(40000)
    assert cashflow.savings_rate(D(100000), D(60000)) == Decimal("0.4")
    assert cashflow.savings_rate(D(0), D(10)) is None
    assert cashflow.savings_rate(D(100000), D(120000)) == Decimal("-0.2")  # overspending is negative, not clamped


def test_emergency_months() -> None:
    assert cashflow.emergency_months(D(300000), D(50000)) == D(6)
    assert cashflow.emergency_months(D(1), D(0)) is None


# ---------- debt (golden values) ----------
def test_emi_golden_50l_at_8_5_for_20y() -> None:
    # Published bank-calculator value for ₹50,00,000 @ 8.5% p.a. over 240 months is ₹43,391.16
    assert debt.emi(D(5_000_000), D("8.5"), 240).value == Decimal("43391.16")


def test_emi_zero_rate_and_validation() -> None:
    assert debt.emi(D(120000), D(0), 12).value == D(10000)
    with pytest.raises(ValueError):
        debt.emi(D(1), D(5), 0)


def test_emi_reconstructs_principal_via_amortisation() -> None:
    """Independent check: paying EMI each month at the monthly rate must clear the loan (within rounding)."""
    p, rate, n = D(1_000_000), D("9"), 60
    e = debt.emi(p, rate, n).value
    bal = p
    for _ in range(n):
        bal = bal * (1 + rate / 1200) - e
    assert abs(bal) < Decimal("1.00")


def test_dti() -> None:
    assert debt.debt_to_income(D(30000), D(100000)) == Decimal("0.3")
    assert debt.debt_to_income(D(1), D(0)) is None


# ---------- growth ----------
def test_fv_sip_golden() -> None:
    # 10,000/month, 12% p.a. (1% monthly), 120 months, end-of-month: 10000*((1.01^120-1)/0.01) = 2,300,386.89
    assert growth.fv_sip(D(10000), D(12), 120).value == Decimal("2300386.89")


def test_fv_lumpsum_golden_and_zero_rate() -> None:
    assert growth.fv_lumpsum(D(100000), D(12), 12).value == Decimal("112682.50")
    assert growth.fv_sip(D(1000), D(0), 24).value == D(24000)


def test_inflate_golden() -> None:
    assert growth.inflate(D(100000), D(6), 10).value == Decimal("179084.77")


@settings(max_examples=60, deadline=None)
@given(
    sip=st.integers(min_value=500, max_value=500_000),
    rate=st.integers(min_value=0, max_value=18),
    months=st.integers(min_value=1, max_value=480),
)
def test_required_sip_inverts_fv_sip(sip: int, rate: int, months: int) -> None:
    target = growth.fv_sip(D(sip), D(rate), months).value
    back = growth.required_sip(target, D(rate), months).value
    assert abs(back - D(sip)) <= Decimal("0.01")


@settings(max_examples=60, deadline=None)
@given(a=st.integers(1000, 100_000), r1=st.integers(0, 15), r2=st.integers(0, 15), m=st.integers(1, 360))
def test_fv_sip_monotonic_in_rate_and_never_below_contributions(a: int, r1: int, r2: int, m: int) -> None:
    lo, hi = sorted((r1, r2))
    v_lo, v_hi = growth.fv_sip(D(a), D(lo), m).value, growth.fv_sip(D(a), D(hi), m).value
    assert v_hi >= v_lo >= D(a) * m


def test_results_carry_assumptions() -> None:
    assert growth.fv_sip(D(1), D(10), 12).assumptions
    assert debt.emi(D(1000), D(10), 12).assumptions


# ---------- retirement ----------
def _pv_by_simulation(expense_m: Decimal, infl: Decimal, ytr: int, ry: int, ret: Decimal) -> Decimal:
    """Independent derivation: discount each year's inflated withdrawal (paid at start of year) at the return."""
    total = Decimal(0)
    for k in range(ry):
        withdrawal = expense_m * 12 * (1 + infl / 100) ** (ytr + k)
        total += withdrawal / (1 + ret / 100) ** k
    return total


@settings(max_examples=40, deadline=None)
@given(
    exp=st.integers(10_000, 500_000),
    infl=st.integers(0, 10),
    ret=st.integers(0, 14),
    ytr=st.integers(0, 40),
    ry=st.integers(1, 40),
)
def test_required_corpus_matches_independent_simulation(exp: int, infl: int, ret: int, ytr: int, ry: int) -> None:
    got = retirement.required_corpus(D(exp), D(infl), ytr, ry, D(ret)).required_corpus
    want = _pv_by_simulation(D(exp), D(infl), ytr, ry, D(ret))
    assert abs(got - want) <= max(Decimal("1"), want * Decimal("1e-9"))


def test_required_corpus_golden_real_return_zero() -> None:
    r = retirement.required_corpus(D(50000), D(6), 20, 25, D(6))
    assert r.inflated_monthly_expense_at_retirement == Decimal("160356.77")
    assert r.required_corpus == round_money(Decimal("160356.77") * 12 * 25) or abs(
        r.required_corpus - Decimal("48107032")
    ) < Decimal("200")
    assert r.assumptions


def test_corpus_gap_sign() -> None:
    assert retirement.corpus_gap(D(100), D(60)) == D(40)
    assert retirement.corpus_gap(D(100), D(160)) == D(-60)
