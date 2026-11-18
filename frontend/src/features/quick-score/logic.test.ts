import { describe, expect, it } from "vitest";

import { EMPTY_FORM, fromFacts, impactLabel, parseMoney, questions, remaining, toRequest } from "./logic";
import type { QuickForm } from "./logic";

const FULL: QuickForm = {
  age: 32, income: "1.5L", expenses: "70000", emi: "0", loans: "", sip: "15k", savings: "10 lakh", mix: "balanced", other: "0",
  dependants: 2, kids: 1, kidsPlanned: true, health: "10L", life: "1cr", goals: 2,
}; // prettier-ignore

describe("parseMoney", () => {
  it("understands Indian shorthand", () => {
    expect(parseMoney("1,50,000")).toBe(150000);
    expect(parseMoney("1.5L")).toBe(150000);
    expect(parseMoney("1.5 lakh")).toBe(150000);
    expect(parseMoney("50k")).toBe(50000);
    expect(parseMoney("2 cr")).toBe(20000000);
    expect(parseMoney("₹ 40,000")).toBe(40000);
    expect(parseMoney("0")).toBe(0);
  });
  it("never guesses", () => {
    expect(parseMoney("")).toBeNull();
    expect(parseMoney("about a lakh")).toBeNull();
    expect(parseMoney("5 bananas")).toBeNull();
    expect(parseMoney("-5")).toBeNull();
  });
});

describe("questions", () => {
  it("asks loans only with EMIs and the children question only with children", () => {
    const keys = (f: QuickForm) => questions(f).map((q) => q.key);
    expect(keys(FULL)).not.toContain("loans");
    expect(keys({ ...FULL, emi: "20000" })).toContain("loans");
    expect(keys({ ...FULL, kids: 0 })).not.toContain("kidsPlanned");
    expect(keys(FULL)).toContain("kidsPlanned");
  });
  it("counts what is left", () => {
    expect(remaining(EMPTY_FORM).length).toBe(13);
    expect(remaining(FULL)).toEqual([]);
    expect(remaining({ ...FULL, income: "0" }).map((q) => q.key)).toEqual(["income"]); // income must be above zero
    expect(remaining({ ...FULL, savings: "0", mix: null })).toEqual([]); // no savings: the mix does not matter
  });
});

describe("toRequest", () => {
  it("converts shorthand to rupees and drops questions that do not apply", () => {
    const r = toRequest({ ...FULL, kids: 0, kidsPlanned: true });
    expect(r).toMatchObject({ monthly_income: 150000, monthly_investment: 15000, savings_total: 1000000, health_cover: 1000000, life_cover: 10000000 });
    expect(r.loans_outstanding).toBeNull();
    expect(r.kids_goal_planned).toBeNull();
    expect(toRequest({ ...FULL, emi: "20k", loans: "8L" }).loans_outstanding).toBe(800000);
  });
});

it("labels impact in plain words", () => {
  expect(impactLabel({ impact: "5", reason: "missing" })).toBe("Adds 5 of 100 points to what is measured");
  expect(impactLabel({ impact: "12.5", reason: "assumed" })).toContain("assumption");
});

describe("fromFacts", () => {
  const f = (field_key: string, value: string, source_type = "USER_STATED") => ({ field_key, value, source_type });
  it("pre-fills what the user said and skips assumptions", () => {
    const form = fromFacts([
      f("age", "34"), f("annual_income", "1800000.00"), f("monthly_emi_total", "0.00"), f("kids", "0"),
      f("retirement_age", "60", "ESTIMATED"), f("equity_holdings", "400000.00", "ESTIMATED"), f("debt_holdings", "300000.00"),
      f("has_health_insurance", "true", "DERIVED"),
    ]); // prettier-ignore
    // the assumed equity split still counts toward the total the user gave; 4L of 7L in equity reads as "a mix"
    expect(form).toMatchObject({ age: 34, income: "150000", emi: "0", kids: 0, savings: "700000", mix: "balanced" });
    expect(form.expenses).toBe("");
    expect(remaining(form).map((q) => q.key)).toEqual(["expenses", "sip", "other", "dependants", "health", "life", "goals"]);
  });
  it("starts empty for a new user", () => {
    expect(fromFacts([])).toEqual(EMPTY_FORM);
  });
});
