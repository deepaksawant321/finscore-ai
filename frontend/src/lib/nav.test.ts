import { describe, expect, it } from "vitest";

import { MOBILE_TAB_HREFS, activeHref, adminNavLinks, mainNavLinks, navGroups } from "./nav";

describe("mainNavLinks", () => {
  it("offers the draft workbook score right after the main Score entry", () => {
    const links = mainNavLinks([]);
    const i = links.findIndex((l) => l.href === "/app/score");
    expect(links[i + 1]).toEqual({ href: "/app/score/matrix", label: "Draft score" });
  });

  it("has no duplicate destinations or labels", () => {
    const links = mainNavLinks(["admin"]);
    expect(new Set(links.map((l) => l.href)).size).toBe(links.length);
    expect(new Set(links.map((l) => l.label)).size).toBe(links.length);
  });

  it("offers Staff only to staff roles", () => {
    expect(mainNavLinks().some((l) => l.href === "/app/staff")).toBe(false);
    expect(mainNavLinks(["user"]).some((l) => l.href === "/app/staff")).toBe(false);
    for (const r of ["support", "compliance", "admin"]) expect(mainNavLinks([r]).some((l) => l.href === "/app/staff")).toBe(true);
  });

  it("keeps every existing entry", () => {
    expect(mainNavLinks().map((l) => l.label)).toEqual(
      expect.arrayContaining(["Today", "Talk", "Coach", "Score", "Health", "DNA", "Goals", "Actions", "What-if", "Memory", "Settings"]),
    );
  });
});

describe("workspace admin navigation", () => {
  it("is shown to workspace members only, whatever their global role", () => {
    expect(adminNavLinks()).toEqual([]);
    expect(adminNavLinks("none")).toEqual([]);
    expect(adminNavLinks("member").map((l) => l.label)).toEqual(["Go-live setup", "Integrations", "Branding", "Team & roles", "Plans & billing"]);
    expect(navGroups(["admin"], "none").some((g) => g.id === "workspace")).toBe(false); // a global admin role grants nothing here
  });

  it("keeps admin entries out of the customer links and in their own group", () => {
    expect(mainNavLinks(["admin"]).some((l) => l.href.startsWith("/app/workspace"))).toBe(false);
    expect(navGroups(["user"], "member").map((g) => g.id)).toEqual(["money", "plan", "account", "workspace"]);
    expect(navGroups(["user"], "unknown").map((g) => g.id)).toEqual(["money", "plan", "account"]);
  });

  it("people without a workspace get one quiet link to create it, and members do not", () => {
    const labels = (s: Parameters<typeof navGroups>[1]) => navGroups(["user"], s).flatMap((g) => g.items.map((i) => i.label));
    expect(labels("none")).toContain("For business");
    expect(labels("member")).not.toContain("For business");
    expect(labels("unknown")).not.toContain("For business"); // nothing flickers in while membership is loading
  });

  it("every group entry has an icon and the mobile tabs point at real destinations", () => {
    const all = navGroups(["admin"], "member").flatMap((g) => g.items);
    expect(all.every((i) => i.icon)).toBe(true);
    for (const h of MOBILE_TAB_HREFS) expect(all.some((i) => i.href === h)).toBe(true);
  });
});

describe("activeHref", () => {
  const hrefs = ["/app", "/app/score", "/app/score/matrix", "/app/goals"];
  it("picks the longest matching entry", () => {
    expect(activeHref("/app/score/matrix", hrefs)).toBe("/app/score/matrix");
    expect(activeHref("/app/score", hrefs)).toBe("/app/score");
    expect(activeHref("/app/goals/123", hrefs)).toBe("/app/goals");
  });
  it("only highlights Home on /app itself", () => {
    expect(activeHref("/app", hrefs)).toBe("/app");
    expect(activeHref("/app/unknown", hrefs)).toBeNull();
  });
});
