import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MatrixScoreCard } from "./home-card";

describe("MatrixScoreCard", () => {
  it("links to the screen and says it is a draft, without showing any number", () => {
    render(<MatrixScoreCard />);
    expect(screen.getByRole("link", { name: "See my draft score" })).toHaveAttribute("href", "/app/score/matrix");
    expect(screen.getByText("Draft rules")).toBeInTheDocument();
    expect(screen.getByText(/not yet approved, so it is a draft/)).toBeInTheDocument();
    expect(screen.queryByText(/out of 900$/)).toBeNull();
  });
});
