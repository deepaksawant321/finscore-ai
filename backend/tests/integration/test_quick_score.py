import httpx

from tests.integration.test_intelligence import auth_client, say, start

API = "/api/v1"
QUICK = {
    "age": 32, "monthly_income": "150000", "monthly_expenses": "70000", "monthly_emi": "0", "loans_outstanding": None,
    "monthly_investment": "15000", "savings_total": "1000000", "mix": "balanced", "other_assets": "0", "dependants": 2,
    "kids": 1, "kids_goal_planned": True, "health_cover": "1000000", "life_cover": "10000000", "pending_goals": 2,
}  # fmt: skip


async def facts(client: httpx.AsyncClient, h: dict[str, str]) -> dict[str, dict]:  # type: ignore[type-arg]
    return {f["field_key"]: f for f in (await client.get(f"{API}/memory/facts", headers=h)).json()}


async def test_quick_score_gives_a_near_complete_score_from_one_screen(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await auth_client(client, mailer)
    r = await client.post(f"{API}/quick-score", headers=h, json=QUICK)
    assert r.status_code == 200, r.text
    s = r.json()
    assert 0 < float(s["overall"]) <= 900 and s["early_estimate"] is False and "NOT AN OFFICIAL" in s["watermark"]
    assert float(s["confidence"]) >= 0.85  # only 80C is unknown after one screen
    scored = {f["id"] for f in s["factors"] if f["status"] == "scored"}
    assert scored >= {"F01", "F02", "F03", "F04", "F05", "F06", "F07", "F08", "F09", "F10", "F11", "F12", "F15"}
    assert s["missing_inputs"] == ["section_80c", "section_80d"]
    f = await facts(client, h)
    assert f["annual_income"]["value"] == "1800000.00" and f["annual_income"]["source_ref"] == "quick_score"
    assert f["annual_income"]["source_type"] == "USER_STATED"
    # the mix chip and the planning assumptions are labelled as estimates, never as something the user said
    assert f["equity_holdings"]["value"] == "500000.00" and f["equity_holdings"]["source_type"] == "ESTIMATED"
    assert f["debt_holdings"]["value"] == "500000.00" and f["debt_holdings"]["source_type"] == "ESTIMATED"
    assert {f[k]["value"] for k in ("retirement_age", "life_expectancy")} == {"60", "85"}
    assert f["risk_profile"]["value"] == "moderately aggressive" and f["risk_profile"]["source_type"] == "ESTIMATED"
    # what follows logically is DERIVED
    assert f["loans_outstanding"]["value"] == "0.00" and f["loans_outstanding"]["source_type"] == "DERIVED"
    assert f["has_health_insurance"]["value"] == "true" and f["has_health_insurance"]["source_type"] == "DERIVED"
    assert any("retirement age: 60 assumed" in a.lower() for a in s["assumptions"])
    assert any("Total loans outstanding" in a and "no loan EMIs" in a for a in s["assumptions"])


async def test_estimates_never_replace_what_the_user_said(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await auth_client(client, mailer)
    await client.patch(f"{API}/profile/facts/retirement_age", headers=h, json={"value": "55"})
    await client.patch(f"{API}/profile/facts/equity_holdings", headers=h, json={"value": "900000"})
    assert (await client.post(f"{API}/quick-score", headers=h, json=QUICK)).status_code == 200
    f = await facts(client, h)
    assert f["retirement_age"]["value"] == "55" and f["retirement_age"]["source_type"] == "USER_STATED"
    assert f["equity_holdings"]["value"] == "900000.00"


async def test_loans_are_asked_only_with_emis_and_derived_values_are_withdrawn(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await auth_client(client, mailer)
    bad = await client.post(f"{API}/quick-score", headers=h, json=QUICK | {"loans_outstanding": "500000"})
    assert bad.status_code == 422  # loans without EMIs is contradictory
    assert (await client.post(f"{API}/quick-score", headers=h, json=QUICK)).status_code == 200
    assert (await facts(client, h))["loans_outstanding"]["source_type"] == "DERIVED"
    # the user now reports an EMI: "no loans" no longer follows, so it is withdrawn and becomes a question again
    await client.patch(f"{API}/profile/facts/monthly_emi_total", headers=h, json={"value": "20000"})
    assert "loans_outstanding" not in await facts(client, h)
    improve = (await client.get(f"{API}/score/matrix/improve", headers=h)).json()
    assert {"field_key": "loans_outstanding", "reason": "missing"}.items() <= next(
        i for i in improve if i["field_key"] == "loans_outstanding"
    ).items()
    again = await client.post(
        f"{API}/quick-score", headers=h, json=QUICK | {"monthly_emi": "20000", "loans_outstanding": "800000"}
    )
    f = (await facts(client, h))["loans_outstanding"]
    assert again.status_code == 200 and f["value"] == "800000.00" and f["source_type"] == "USER_STATED"


async def test_improve_ranks_questions_by_how_much_score_they_firm_up(client: httpx.AsyncClient, mailer) -> None:  # type: ignore[no-untyped-def]
    h = await auth_client(client, mailer)
    first = (await client.get(f"{API}/score/matrix/improve", headers=h)).json()
    assert [i["field_key"] for i in first] == ["age", "annual_income"]  # nothing can be scored without these
    await client.post(f"{API}/quick-score", headers=h, json=QUICK)
    items = (await client.get(f"{API}/score/matrix/improve", headers=h)).json()
    impacts = [float(i["impact"]) for i in items]
    assert impacts == sorted(impacts, reverse=True)
    # the equity/debt split was assumed from one chip and feeds 3 areas (25 of 100 points, halved): asked first
    assert {items[0]["field_key"], items[1]["field_key"]} == {"debt_holdings", "equity_holdings"}
    missing = {i["field_key"]: i for i in items if i["reason"] == "missing"}
    assert set(missing) == {"section_80c", "section_80d"} and float(missing["section_80c"]["impact"]) == 5
    assert missing["section_80c"]["question"] and missing["section_80c"]["kind"] == "money"
    assumed = [i for i in items if i["reason"] == "assumed"]
    assert {i["field_key"] for i in assumed} == {
        "equity_holdings",
        "debt_holdings",
        "retirement_age",
        "life_expectancy",
        "risk_profile",
    }
    ret = next(i for i in assumed if i["field_key"] == "retirement_age")
    assert ret["current_value"] == "60" and missing["section_80c"]["current_value"] is None
    # keeping an assumed value as it is makes it the user's own (stated) value
    kept = await client.patch(f"{API}/profile/facts/life_expectancy", headers=h, json={"value": "85"})
    assert kept.json()["changed"] is True and kept.json()["fact"]["source_type"] == "USER_STATED"
    # answering an assumed value replaces the estimate and it drops off the list
    await client.patch(f"{API}/profile/facts/retirement_age", headers=h, json={"value": "58"})
    assert "retirement_age" not in [i["field_key"] for i in (await client.get(f"{API}/score/matrix/improve", headers=h)).json()]


async def test_no_health_insurance_fills_cover_and_80d_and_no_kids_skips_the_kids_question(
    client: httpx.AsyncClient, mailer
) -> None:  # type: ignore[no-untyped-def]
    h = await auth_client(client, mailer)
    await client.post(f"{API}/quick-score", headers=h, json=QUICK | {"health_cover": "0", "kids": 0, "kids_goal_planned": None})
    f = await facts(client, h)
    assert f["has_health_insurance"]["value"] == "false" and f["section_80d"]["value"] == "0.00"
    assert f["section_80d"]["source_type"] == "DERIVED" and "kids_goal_planned" not in f
    s = (await client.post(f"{API}/score/matrix/compute", headers=h)).json()
    assert s["missing_inputs"] == ["section_80c"]  # the kids factor is not applicable, not missing
    cid = await start(client, h)
    t = await say(client, h, cid, "I want to plan better", accept=False)
    asked = t["next_question"]["field_key"] if t["next_question"] else None
    assert asked not in {"kids_goal_planned", "home_ownership", "section_80d", "health_cover_amount", "loans_outstanding"}
