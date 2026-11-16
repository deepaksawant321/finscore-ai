import { describe, expect, it } from "vitest";

import { factor } from "./fixtures";
import { biggestGaps, confidencePct, fieldLabel, groupFactors, orderedMissing, pointsAvailable, pointsShare, visibleAssumptions } from "./logic";

describe("matrix score logic", () => {
  it("shares and available points come from the backend's numbers", () => {
    const f = factor({ id: "F01", name: "Cashflow", points: "36.00", max_points: "90.00" });
    expect(pointsShare(f)).toBeCloseTo(0.4);
    expect(pointsAvailable(f)).toBeCloseTo(54);
  });

  it("unscored factors have no share and no available points", () => {
    const f = factor({ id: "F03", name: "Assets", status: "missing", points: null, max_points: "81.00" });
    expect(pointsShare(f)).toBe(0);
    expect(pointsAvailable(f)).toBe(0);
  });

  it("a full-marks factor has a full bar and no gap", () => {
    const f = factor({ id: "F09", name: "FOIR", points: "54.00", max_points: "54.00" });
    expect(pointsShare(f)).toBe(1);
    expect(pointsAvailable(f)).toBe(0);
  });

  it("ranks the biggest gaps first, ignores unscored and full-marks factors, and caps the list", () => {
    const fs = [
      factor({ id: "F01", name: "A", points: "36.00", max_points: "90.00" }), // gap 54
      factor({ id: "F02", name: "B", points: "48.60", max_points: "81.00" }), // gap 32.4
      factor({ id: "F03", name: "C", status: "missing", points: null }),
      factor({ id: "F04", name: "D", points: "54.00", max_points: "54.00" }), // none
      factor({ id: "F05", name: "E", points: "0.00", max_points: "72.00" }), // gap 72
      factor({ id: "F06", name: "F", points: "30.00", max_points: "63.00" }), // gap 33
    ];
    expect(biggestGaps(fs).map((f) => f.id)).toEqual(["F05", "F01", "F06"]);
    expect(biggestGaps(fs, 10).map((f) => f.id)).toEqual(["F05", "F01", "F06", "F02"]);
    expect(biggestGaps([])).toEqual([]);
  });

  it("equal gaps keep the original factor order", () => {
    const a = factor({ id: "F01", name: "A", points: "40.00", max_points: "90.00" });
    const b = factor({ id: "F02", name: "B", points: "40.00", max_points: "90.00" });
    expect(biggestGaps([a, b]).map((f) => f.id)).toEqual(["F01", "F02"]);
  });

  it("groups factors by status", () => {
    const g = groupFactors([
      factor({ id: "F01", name: "A" }),
      factor({ id: "F02", name: "B", status: "missing" }),
      factor({ id: "F03", name: "C", status: "not_applicable" }),
    ]);
    expect([g.scored.length, g.missing.length, g.notApplicable.length]).toEqual([1, 1, 1]);
  });

  it("labels known fields in plain language and falls back readably", () => {
    expect(fieldLabel("life_cover_amount")).toBe("your life insurance cover");
    expect(fieldLabel("some_new_field")).toBe("some new field");
  });

  it("rounds confidence to a whole percent", () => {
    expect(confidencePct({ confidence: "0.4400" })).toBe(44);
    expect(confidencePct({ confidence: "1.0000" })).toBe(100);
  });

  it("orders missing fields the way the interview asks them, unknown keys last", () => {
    expect(orderedMissing(["section_80d", "equity_holdings", "zzz_new", "loans_outstanding", "life_cover_amount"])).toEqual([
      "loans_outstanding",
      "equity_holdings",
      "life_cover_amount",
      "section_80d",
      "zzz_new",
    ]);
  });

  it("drops only the generic missing-factors note from the assumptions", () => {
    const got = visibleAssumptions({
      assumptions: ["Planning age 80 assumed (not provided)"],
      notes: ["Some factors are missing or not applicable: the score is rescaled", "F08: retirement age <= current age, scored in the lowest band"],
    });
    expect(got).toEqual(["Planning age 80 assumed (not provided)", "F08: retirement age <= current age, scored in the lowest band"]);
  });
});
