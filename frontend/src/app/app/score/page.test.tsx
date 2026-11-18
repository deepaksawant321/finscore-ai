import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { score } from "@/features/matrix-score/fixtures";

const GET = vi.fn();
const POST = vi.fn();
vi.mock("@/lib/api/client", () => ({ api: { GET: (...a: unknown[]) => GET(...a), POST: (...a: unknown[]) => POST(...a) } }));

import ScorePage from "./page";

const ok = (data: unknown) => Promise.resolve({ data, response: new Response(null, { status: 200 }) });

function wrap(ui: ReactNode, qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })) {
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  GET.mockReset();
  POST.mockReset();
});

describe("ScorePage", () => {
  it("shows the current FinScore without the user having to press anything", async () => {
    GET.mockImplementation((path: string) => (path === "/api/v1/score/matrix/current" ? ok(score()) : ok(null)));
    wrap(<ScorePage />);
    expect(await screen.findByRole("heading", { name: "Your FinScore" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Calculate again" })).toBeEnabled();
    expect(POST).not.toHaveBeenCalledWith("/api/v1/score/matrix/compute");
  });

  it("sends a new user to the Money Map instead of saying there is no score", async () => {
    GET.mockImplementation(() => ok(null));
    wrap(<ScorePage />);
    expect(await screen.findByText(/You don.t have a score yet/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Get my score in about a minute" })).toHaveAttribute("href", "/app/journey");
  });

  it("recalculates on request", async () => {
    GET.mockImplementation((path: string) => (path === "/api/v1/score/matrix/current" ? ok(score()) : ok(null)));
    POST.mockImplementation(() => ok(score()));
    wrap(<ScorePage />);
    await userEvent.click(await screen.findByRole("button", { name: "Calculate again" }));
    expect(POST).toHaveBeenCalledWith("/api/v1/score/matrix/compute");
  });
});
