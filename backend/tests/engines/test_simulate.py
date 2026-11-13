from decimal import Decimal

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from app.engines import growth, simulate
from app.engines.money import D


def test_known_value_matches_closed_form() -> None:
    r = simulate.invest(D(10000), D(0), D(12), 10)
    assert r.final_value == growth.fv_sip(D(10000), D(12), 120).value  # independent closed form
    assert r.total_contributed == D(1200000) and r.gain == r.final_value - r.total_contributed
    assert r.real_value is None  # no inflation assumption supplied => none invented


def test_zero_return_is_simple_addition() -> None:
    r = simulate.invest(D(5000), D(100000), D(0), 5)
    assert r.final_value == D(400000) and r.gain == 0


def test_inflation_gives_a_todays_rupees_value() -> None:
    r = simulate.invest(D(10000), D(0), D(8), 10, D(6))
    assert r.real_value is not None and r.real_value < r.final_value
    assert r.real_value == (r.final_value / (Decimal("1.06") ** 10)).quantize(Decimal("0.01"))


@pytest.mark.parametrize(
    "bad", [dict(years=0), dict(years=61), dict(return_pct=D(-1)), dict(return_pct=D(31)), dict(monthly=D(-1))]
)
def test_invalid_inputs_are_rejected(bad: dict[str, object]) -> None:
    args: dict[str, object] = dict(monthly=D(1000), lumpsum=D(0), return_pct=D(8), years=5)
    args.update(bad)
    with pytest.raises(ValueError):
        simulate.invest(args["monthly"], args["lumpsum"], args["return_pct"], args["years"])  # type: ignore[arg-type]


def test_inflation_assumption_is_validated_too() -> None:
    with pytest.raises(ValueError):
        simulate.invest(D(1000), D(0), D(8), 5, D(99))


@settings(max_examples=60, deadline=None)
@given(monthly=st.integers(0, 500_000), lump=st.integers(0, 50_000_000), rate=st.integers(0, 2000), years=st.integers(1, 40))
def test_schedule_agrees_with_closed_form_and_is_monotonic(monthly: int, lump: int, rate: int, years: int) -> None:
    ret = Decimal(rate) / 100
    r = simulate.invest(D(monthly), D(lump), ret, years)
    closed = growth.fv_lumpsum(D(lump), ret, years * 12).value + growth.fv_sip(D(monthly), ret, years * 12).value
    assert abs(r.schedule[-1].balance - closed) <= Decimal("0.02")  # iteration vs formula, rounding only
    assert abs(r.final_value - closed) <= Decimal("0.01")
    balances = [p.balance for p in r.schedule]
    assert balances == sorted(balances) and len(balances) == years  # never decreases with a non-negative return
    assert r.final_value >= r.total_contributed  # a non-negative return never loses money in the model


def test_same_inputs_same_output() -> None:
    a = simulate.invest(D(25000), D(500000), D("9.5"), 15, D(5))
    b = simulate.invest(D(25000), D(500000), D("9.5"), 15, D(5))
    assert a == b
