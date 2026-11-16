import { describe, expect, it } from "vitest";

import type { Activity, Plan } from "./api";
import { DEFAULT_THEME } from "@/lib/theme/tenant-theme";
import { activityText, brandingFromTheme, canGoLive, checklistView, enabledModules, planFeatures, remainingSteps, sameBranding, seatsLeft, slugify, snippet, themeFromBranding } from "./logic";

const server = (done: string[]) => ["workspace", "sandbox_key", "data_source", "branding", "snippet"].map((id) => ({ id, done: done.includes(id) }));

describe("setup checklist (the server decides what is done)", () => {
  it("adds words and links to the server's steps and cannot go live until all are done", () => {
    const items = checklistView(server(["workspace", "sandbox_key"]));
    expect(items.map((i) => i.title)).toEqual(["Create your workspace", "Create a sandbox API key", "Connect a data source", "Brand your widget", "Embed the snippet"]);
    expect(remainingSteps(items)).toBe(3);
    expect(canGoLive(items)).toBe(false);
    for (const i of items.filter((x) => !x.done)) expect(i.cta?.href).toMatch(/^\/app\/workspace\//);
  });
  it("can go live when everything is done", () => {
    expect(canGoLive(checklistView(server(["workspace", "sandbox_key", "data_source", "branding", "snippet"])))).toBe(true);
  });
  it("shows an unknown step by its id rather than hiding it", () => {
    expect(checklistView([{ id: "new_step", done: false }])[0]?.title).toBe("new_step");
  });
});

describe("helpers", () => {
  it("slugifies workspace names", () => {
    expect(slugify("Northstar Bank")).toBe("northstar-bank");
    expect(slugify("  !!  ")).toBe("workspace");
  });
  it("counts seats left, and treats a missing limit as unlimited", () => {
    expect(seatsLeft(4, 5)).toBe(1);
    expect(seatsLeft(9, 5)).toBe(0);
    expect(seatsLeft(50, null)).toBeNull();
  });
  it("lists enabled modules in catalogue order and ignores unknown ids", () => {
    expect(enabledModules(["goals", "score", "mystery", "sim"])).toEqual(["score", "sim", "goals"]);
  });
});

describe("snippets", () => {
  const o = { slug: "acme", modules: ["score", "coach"] as ("score" | "coach")[], publishableKey: "fs_pub_test_abc", apiBase: "https://app.example.com" };
  it("embeds the workspace, modules and the workspace's own publishable key", () => {
    const s = snippet("embed", o);
    expect(s).toContain('data-workspace="acme"');
    expect(s).toContain('data-modules="score,coach"');
    expect(s).toContain('data-key="fs_pub_test_abc"');
  });
  it("the REST sample calls the real partner endpoint and never contains a secret value", () => {
    const s = snippet("api", o);
    expect(s).toContain("https://app.example.com/api/v1/partner/scores");
    expect(s).toContain("$FINSCORE_SECRET_KEY");
    expect(s).not.toMatch(/fs_sec_/);
  });
  it("is honest that the React SDK is not published", () => {
    expect(snippet("sdk", o)).toContain("not published yet");
    expect(snippet("sdk", o)).toContain('modules={["score", "coach"]}');
  });
  it("falls back to a clearly fake key before keys have loaded", () => {
    expect(snippet("embed", { slug: "x", modules: [] })).toContain("YOUR_KEY");
  });
});

describe("plan cards are built from the numbers the API enforces", () => {
  const inr = (n: number) => `₹${n.toFixed(2)}`;
  const base: Plan = { key: "growth", name: "Growth", price_per_month_monthly: "24999", price_per_month_yearly: "19999", scores_per_month: 25000, overage_per_score: "0.80", seats: 5, modules: 3, live_allowed: true, self_serve: true };
  it("describes quota, environment, modules, seats and overage", () => {
    expect(planFeatures(base, inr)).toEqual(["25,000 scores a month", "Live environment", "3 modules", "5 seats", "Overage ₹0.80 per score"]);
  });
  it("says a free plan stops at its limit and is sandbox only", () => {
    const f = planFeatures({ ...base, key: "starter", live_allowed: false, scores_per_month: 100, modules: 1, seats: 1, overage_per_score: "0" }, inr);
    expect(f).toEqual(["100 scores a month", "Sandbox only", "1 module", "1 seat", "Stops at the monthly limit"]);
  });
});

describe("activity feed wording", () => {
  const a = (action: string, meta: Record<string, unknown> = {}, actor: string | null = "a@example.com"): Activity => ({ action, actor_email: actor, at: "2026-11-16T10:00:00Z", meta });
  it("reads as a sentence with who did it", () => {
    expect(activityText(a("apikey.rotated", { environment: "test" }))).toBe("a@example.com rotated the sandbox secret key");
    expect(activityText(a("member.invited", { role: "viewer" }))).toBe("a@example.com invited someone as Viewer");
    expect(activityText(a("env.live", {}, null))).toBe("Someone switched the workspace to Live");
  });
  it("uses friendly names for data sources", () => {
    expect(activityText(a("connector.connected", { connector: "aa" }))).toBe("a@example.com connected Account Aggregator");
  });
  it("shows an unknown action by its code instead of hiding it", () => {
    expect(activityText(a("future.thing"))).toBe("a@example.com future.thing");
  });
});

describe("branding mapping", () => {
  it("round-trips a theme through the API shape", () => {
    const body = brandingFromTheme({ ...DEFAULT_THEME, name: "Acme", brand: "#E11D48", poweredBy: false });
    expect(body).toEqual({ name: "Acme", brand: "#E11D48", accent: DEFAULT_THEME.accent, radius: 24, font: "inter", powered_by: false });
    expect(themeFromBranding(body)).toMatchObject({ name: "Acme", brand: "#E11D48", poweredBy: false });
    expect(themeFromBranding(null)).toBeNull();
  });
  it("compares ignoring hex case, and treats nothing saved as different", () => {
    const body = brandingFromTheme({ ...DEFAULT_THEME, brand: "#e11d48" });
    expect(sameBranding(body, { ...body, brand: "#E11D48" })).toBe(true);
    expect(sameBranding(body, { ...body, radius: 8 })).toBe(false);
    expect(sameBranding(body, null)).toBe(false);
  });
});
