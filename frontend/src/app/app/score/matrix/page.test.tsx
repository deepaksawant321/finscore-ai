import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { score } from "@/features/matrix-score/fixtures";

const POST = vi.fn();
vi.mock("@/lib/api/client", () => ({ api: { POST: (...a: unknown[]) => POST(...a) } }));

import MatrixScorePage from "./page";

function wrap(ui: ReactNode, qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })) {
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  POST.mockReset(); // braces: a returned function would be run by Vitest as a teardown hook
});

describe("MatrixScorePage", () => {
  it("does not calculate (and so does not write an audit record) until the user asks", () => {
    wrap(<MatrixScorePage />);
    expect(POST).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Calculate my score" })).toBeEnabled();
    expect(screen.getByText(/anything I don.t know is left out rather than guessed/)).toBeInTheDocument();
  });

  it("calculates on click and shows the result, then offers to calculate again", async () => {
    POST.mockResolvedValue({ data: score(), error: undefined });
    wrap(<MatrixScorePage />);
    await userEvent.click(screen.getByRole("button", { name: "Calculate my score" }));
    expect(POST).toHaveBeenCalledWith("/api/v1/score/matrix/compute");
    expect(await screen.findByRole("figure")).toHaveAccessibleName(/560 out of 900/);
    expect(screen.getByRole("button", { name: "Calculate again" })).toBeInTheDocument();
  });

  it("when there is not enough data it links to the quick questions", async () => {
    POST.mockResolvedValue({
      data: undefined,
      error: { code: "insufficient_data", title: "Not enough information to compute a score yet", detail: "Tell me your age and your yearly income." },
    });
    wrap(<MatrixScorePage />);
    await userEvent.click(screen.getByRole("button", { name: "Calculate my score" }));
    const alert = await screen.findByRole("status");
    expect(alert).toHaveTextContent("I need a little more before I can score you.");
    expect(screen.getByRole("link", { name: "Answer a few quick questions" })).toHaveAttribute("href", "/app/journey");
    expect(screen.queryByRole("figure")).toBeNull();
  });

  it("an unavailable score (rules not approved) is shown as an error, not as a number", async () => {
    POST.mockResolvedValue({
      data: undefined,
      error: { code: "rulebook_not_approved", title: "FinScore is not available yet", detail: "The official scoring rules have not been approved by the Product Team." },
    });
    wrap(<MatrixScorePage />);
    await userEvent.click(screen.getByRole("button", { name: "Calculate my score" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("FinScore is not available yet");
    expect(screen.queryByRole("figure")).toBeNull();
  });

  it("a network failure shows a retryable error", async () => {
    POST.mockRejectedValue(new Error("network"));
    wrap(<MatrixScorePage />);
    await userEvent.click(screen.getByRole("button", { name: "Calculate my score" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Could not calculate your score/);
    expect(screen.getByRole("button", { name: "Calculate my score" })).toBeEnabled();
  });

  it("keeps the last result when the user comes back to the page", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData(["matrix-score"], score());
    wrap(<MatrixScorePage />, qc);
    expect(await screen.findByRole("figure")).toBeInTheDocument();
    expect(POST).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Calculate again" })).toBeInTheDocument();
  });
});
