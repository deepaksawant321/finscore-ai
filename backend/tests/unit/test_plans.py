from datetime import UTC, datetime
from decimal import Decimal

from app.domains.organizations import plans as P
from app.domains.organizations.service import billable_env, next_month_start, period_of, slugify

G, S, E = P.PLANS["growth"], P.PLANS["starter"], P.PLANS["enterprise"]


def test_growth_monthly_price_with_gst() -> None:
    e = P.estimate(G, "monthly", 0)
    assert e is not None
    assert (e.base, e.overage_amount, e.subtotal, e.gst, e.total) == (
        Decimal("24999.00"), Decimal("0.00"), Decimal("24999.00"), Decimal("4499.82"), Decimal("29498.82"),
    )  # fmt: skip


def test_yearly_cycle_is_cheaper_per_month() -> None:
    m, y = P.estimate(G, "monthly", 0), P.estimate(G, "yearly", 0)
    assert m is not None and y is not None and y.base == Decimal("19999.00") < m.base


def test_overage_is_billed_per_score_above_the_quota_only() -> None:
    e = P.estimate(G, "yearly", 25_010)
    assert e is not None and e.overage_scores == 10 and e.overage_amount == Decimal("8.00")
    assert e.subtotal == Decimal("20007.00") and e.total == Decimal("23608.26")
    at_quota = P.estimate(G, "yearly", 25_000)
    assert at_quota is not None and at_quota.overage_scores == 0


def test_starter_is_free_and_hard_capped_so_never_bills_overage() -> None:
    e = P.estimate(S, "monthly", 5_000)
    assert e is not None and e.total == Decimal("0.00") and e.overage_scores == 0 and S.hard_cap


def test_enterprise_has_no_list_price() -> None:
    assert P.estimate(E, "monthly", 0) is None and not E.self_serve


def test_upgrade_versus_downgrade() -> None:
    assert P.is_upgrade(S, G, "monthly", "monthly")
    assert not P.is_upgrade(G, S, "monthly", "monthly")
    assert not P.is_upgrade(G, G, "monthly", "yearly")  # a cheaper cycle waits for the period end
    assert P.is_upgrade(G, G, "yearly", "monthly")  # paying more takes effect now


def test_entitlement_checks() -> None:
    assert P.seats_ok(G, 5) and not P.seats_ok(G, 6) and P.seats_ok(E, 500)
    assert (
        P.modules_ok(G, ["score", "coach", "sim"])
        and not P.modules_ok(G, ["score", "coach", "sim", "dna"])
        and not P.modules_ok(S, ["score", "coach"])
    )


def test_permission_matrix_matches_the_ui() -> None:
    assert "billing.manage" in P.permissions_for("admin") and "billing.manage" not in P.permissions_for("analyst")
    assert P.permissions_for("viewer") == ["scores.view"]
    assert "data.export" in P.permissions_for("analyst") and "data.export" not in P.permissions_for("viewer")


def test_billable_environment_follows_the_plan() -> None:
    assert billable_env(S) == "test" and billable_env(G) == "live"


def test_period_helpers() -> None:
    d = datetime(2026, 12, 31, 10, tzinfo=UTC)
    assert period_of(d) == "2026-12" and next_month_start(d) == datetime(2027, 1, 1, tzinfo=UTC)
    assert slugify("  Acme Wealth & Co. ") == "acme-wealth-co" and slugify("???") == "workspace"
