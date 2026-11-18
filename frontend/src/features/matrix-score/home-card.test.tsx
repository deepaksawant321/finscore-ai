import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { score } from "./fixtures";

const GET = vi.fn();
vi.mock("@/lib/api/client", () => ({ api: { GET: (...a: unknown[]) => GET(...a), POST: vi.fn() } }));

import { MatrixScoreCard } from "./home-card";

const wrap = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MatrixScoreCard />
    </QueryClientProvider>,
  );

describe("MatrixScoreCard", () => {
  it("shows the score number on Home and links to the breakdown", async () => {
    GET.mockResolvedValue({ data: score({ overall: "607.00", confidence: "0.6900" }), response: new Response(null, { status: 200 }) });
    wrap();
    expect(await screen.findByText(/607 out of 900/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See what drives it" })).toHaveAttribute("href", "/app/score");
  });

  it("renders nothing before there is a score (the Money Map card invites the user instead)", async () => {
    GET.mockResolvedValue({ data: null, response: new Response(null, { status: 200 }) });
    const { container } = wrap();
    await new Promise((r) => setTimeout(r, 0));
    expect(container).toBeEmptyDOMElement();
  });
});
