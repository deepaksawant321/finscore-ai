import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { factor, score } from "./fixtures";
import { MatrixScoreView } from "./matrix-score-view";

describe("MatrixScoreView", () => {
  it("an early estimate shows the number but draws no conclusion", () => {
    render(<MatrixScoreView score={score()} />);
    expect(screen.getByRole("figure")).toHaveAccessibleName(/560 out of 900, early estimate/);
    expect(screen.getAllByText("Early estimate").length).toBeGreaterThan(0);
    expect(screen.getByText(/won.t draw a conclusion/)).toBeInTheDocument();
    expect(screen.getByText("Confidence: 44%")).toBeInTheDocument();
    expect(screen.getByText("2 of 4 areas measured")).toBeInTheDocument();
  });

  it("always says it is a draft, never official", () => {
    render(<MatrixScoreView score={score()} />);
    expect(screen.getByText(/NOT AN OFFICIAL FINSCORE/)).toBeInTheDocument();
    expect(screen.getByText("Draft rules")).toBeInTheDocument();
    expect(screen.getByText(/Rule set: WORKBOOK DRAFT - NOT OFFICIAL/)).toBeInTheDocument();
  });

  it("lists scored factors with points, a progress bar and the working", () => {
    render(<MatrixScoreView score={score()} />);
    const list = screen.getByRole("list", { name: "Score factors" });
    const bar = within(list).getByRole("progressbar", { name: "Cashflow: 36.00 of 90.00 points" });
    expect(bar).toHaveAttribute("aria-valuenow", "36");
    expect(bar).toHaveAttribute("aria-valuemax", "90");
    expect(within(list).getByText(/36\.00 of 90\.00 points · 4\/10/)).toBeInTheDocument();
    expect(within(list).getAllByText("How this was worked out").length).toBe(2);
  });

  it("explains unscored and not-applicable factors without scoring them as zero", () => {
    render(<MatrixScoreView score={score()} />);
    const list = screen.getByRole("list", { name: "Score factors" });
    expect(within(list).getByText(/not scored yet: I still need your stocks and equity funds, your other assets/)).toBeInTheDocument();
    expect(within(list).getByText(/does not apply to you, so it is left out/)).toBeInTheDocument();
    expect(within(list).queryByRole("progressbar", { name: /Assets/ })).toBeNull();
  });

  it("asks for the missing details by name and links to the conversation", () => {
    render(<MatrixScoreView score={score()} />);
    const missing = screen.getByRole("list", { name: "Missing details" });
    expect(within(missing).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "your stocks and equity funds",
      "your other assets (gold, property)",
      "your life insurance cover",
    ]);
    expect(screen.getByRole("link", { name: "Tell me in conversation" })).toHaveAttribute("href", "/app/interview");
  });

  it("shows the assumptions that were made, but not the generic missing-factors note", () => {
    render(<MatrixScoreView score={score({ notes: ["Some factors are missing or not applicable: the score is rescaled"] })} />);
    const list = screen.getByRole("list", { name: "Assumptions" });
    expect(list).toHaveTextContent("Risk profile Balanced assumed");
    expect(list).not.toHaveTextContent("Some factors are missing");
  });

  it("shows no assumptions card when there is nothing to say", () => {
    render(<MatrixScoreView score={score({ assumptions: [], notes: ["Some factors are missing or not applicable: x"] })} />);
    expect(screen.queryByRole("list", { name: "Assumptions" })).toBeNull();
  });

  it("a complete score shows the verdict message, no early-estimate wording and no missing-details card", () => {
    const full = score({
      early_estimate: false,
      confidence: "1.0000",
      message: "Need to maintain the same.",
      overall: "765.90",
      missing_inputs: [],
      assumptions: [],
      factors: [factor({ id: "F01", name: "Cashflow" }), factor({ id: "F02", name: "Savings", points: "81.00", max_points: "81.00", factor_score: 10 })],
    });
    render(<MatrixScoreView score={full} />);
    expect(screen.getByText("Need to maintain the same.")).toBeInTheDocument();
    expect(screen.queryByText("Early estimate")).toBeNull();
    expect(screen.queryByRole("list", { name: "Missing details" })).toBeNull();
    expect(screen.queryByText(/Assumptions I made/)).toBeNull();
    expect(screen.getByRole("figure")).toHaveAccessibleName(/766 out of 900, Draft score/);
    expect(screen.getByText("2 of 2 areas measured")).toBeInTheDocument();
  });

  it("points out where there is most room to improve, without giving advice", () => {
    render(<MatrixScoreView score={score()} />);
    const gaps = screen.getByRole("list", { name: "Largest gaps" });
    expect(within(gaps).getAllByRole("listitem")[0]).toHaveTextContent("Cashflow — 36.00 of 90.00 points");
    expect(screen.getByText(/not advice on what to buy or do/)).toBeInTheDocument();
  });

  it("shows the audit fingerprint so a result can be traced", () => {
    render(<MatrixScoreView score={score()} />);
    expect(screen.getByText(/fingerprint abcdef01/)).toBeInTheDocument();
  });
});
