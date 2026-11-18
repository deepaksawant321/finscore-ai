import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { JourneyCard } from "./logic";
import { QuestionCard } from "./question-card";

const base: JourneyCard = {
  key: "monthly_emi_total", chapter: "snapshot", prompt: "How much goes to loan EMIs each month?", why: "Why", kind: "money",
  unit: "INR/month", chips: [{ label: "None", value: "0" }, { label: "10k", value: "10000" }], choices: [], mixes: [],
  per_month: false, assumed_value: null, unsure_ok: true,
}; // prettier-ignore

describe("QuestionCard", () => {
  it("answers at once when a chip is tapped", async () => {
    const onSubmit = vi.fn();
    render(<QuestionCard card={base} busy={false} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: "10k" }));
    expect(onSubmit).toHaveBeenCalledWith({ value: "10000" });
  });

  it("understands typed shorthand and only allows Next for a readable amount", async () => {
    const onSubmit = vi.fn();
    render(<QuestionCard card={base} busy={false} onSubmit={onSubmit} />);
    const box = screen.getByRole("textbox");
    await userEvent.type(box, "about");
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    await userEvent.clear(box);
    await userEvent.type(box, "1.5L{enter}");
    expect(onSubmit).toHaveBeenCalledWith({ value: "150000" });
  });

  it("asks how savings are invested before sending a savings total", async () => {
    const onSubmit = vi.fn();
    const card: JourneyCard = {
      ...base, key: "savings_mix", kind: "savings_mix", chips: [{ label: "None", value: "0" }, { label: "5L", value: "500000" }],
      mixes: [{ key: "balanced", label: "A mix" }],
    }; // prettier-ignore
    render(<QuestionCard card={card} busy={false} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: "5L" }));
    expect(onSubmit).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "A mix" }));
    expect(onSubmit).toHaveBeenCalledWith({ value: "500000", mix: "balanced" });
  });

  it("offers to keep an assumption, and to put a question off", async () => {
    const onSubmit = vi.fn();
    const { rerender } = render(<QuestionCard card={{ ...base, key: "retirement_age", kind: "int", assumed_value: "60" }} busy={false} onSubmit={onSubmit} />);
    expect(screen.getByText("60")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Keep it" }));
    expect(onSubmit).toHaveBeenCalledWith({ keep: true });
    expect(screen.queryByText(/Not sure/)).toBeNull(); // an assumption is already a fallback
    rerender(<QuestionCard card={base} busy={false} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: /Not sure/ }));
    expect(onSubmit).toHaveBeenCalledWith({ skip: true });
  });
});
