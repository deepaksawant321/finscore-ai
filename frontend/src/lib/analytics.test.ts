import { beforeEach, describe, expect, it, vi } from "vitest";

const POST = vi.fn();
vi.mock("@/lib/api/client", () => ({ api: { POST: (...a: unknown[]) => POST(...a) } }));

import { reportClientError, track } from "./analytics";

beforeEach(() => {
  POST.mockReset();
  POST.mockResolvedValue({ response: new Response(null, { status: 204 }) });
});

describe("track", () => {
  it("sends the event to our own API with the page path and a browser id, never anything else", () => {
    track("journey_answer", { card: "monthly_expenses" });
    expect(POST).toHaveBeenCalledWith("/api/v1/events", {
      body: expect.objectContaining({ name: "journey_answer", props: { card: "monthly_expenses" }, path: "/", anon_id: expect.any(String) }),
    });
  });

  it("never breaks the page when the API fails", () => {
    POST.mockImplementation(() => {
      throw new Error("network down");
    });
    expect(() => track("home_view")).not.toThrow();
  });
});

describe("reportClientError", () => {
  it("reports each distinct error once and at most ten per page load", () => {
    reportClientError("boom", "window_error");
    reportClientError("boom", "window_error");
    for (let i = 0; i < 20; i++) reportClientError(`e${i}`, "window_error");
    expect(POST.mock.calls.filter(([url]) => url === "/api/v1/client-errors")).toHaveLength(10);
  });
});
