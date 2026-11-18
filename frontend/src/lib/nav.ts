import type { IconName } from "@/design-system/icons";

export type NavLink = { href: string; label: string };
export type NavGroup = { id: string; label: string; items: (NavLink & { icon: IconName })[] };

const STAFF_ROLES = ["support", "compliance", "admin"];

/** The customer app: what the end user of a workspace sees. Order matters (nav.test.ts locks "Draft score" right after "Score"). */
const CUSTOMER_GROUPS: NavGroup[] = [
  {
    id: "money",
    label: "Your money",
    items: [
      { href: "/app", label: "Home", icon: "home" },
      { href: "/app/journey", label: "Money Map", icon: "goal" },
      { href: "/app/today", label: "Today", icon: "bell" },
      { href: "/app/interview", label: "Talk", icon: "chat" },
      { href: "/app/coach", label: "Coach", icon: "spark" },
      { href: "/app/score", label: "Score", icon: "score" },
      { href: "/app/score/matrix", label: "Draft score", icon: "approx" },
      { href: "/app/health", label: "Health", icon: "heart" },
      { href: "/app/dna", label: "DNA", icon: "dna" },
    ],
  },
  {
    id: "plan",
    label: "Plan",
    items: [
      { href: "/app/goals", label: "Goals", icon: "goal" },
      { href: "/app/actions", label: "Actions", icon: "act" },
      { href: "/app/simulate", label: "What-if", icon: "sim" },
    ],
  },
  {
    id: "account",
    label: "Account",
    items: [
      { href: "/app/memory", label: "Memory", icon: "mem" },
      { href: "/app/settings", label: "Settings", icon: "cog" },
    ],
  },
];

const STAFF_ITEM = { href: "/app/staff", label: "Staff", icon: "staff" } as const;

/** Workspace admin screens (SaaS layer), backed by the organisation API. */
const WORKSPACE_GROUP: NavGroup = {
  id: "workspace",
  label: "Workspace admin",
  items: [
    { href: "/app/workspace/setup", label: "Go-live setup", icon: "rocket" },
    { href: "/app/workspace/integrations", label: "Integrations", icon: "plug" },
    { href: "/app/workspace/branding", label: "Branding", icon: "palette" },
    { href: "/app/workspace/team", label: "Team & roles", icon: "users" },
    { href: "/app/workspace/billing", label: "Plans & billing", icon: "card" },
  ],
};

export const isStaff = (roles: string[] = []): boolean => roles.some((r) => STAFF_ROLES.includes(r));

/**
 * Whether the signed-in user belongs to a workspace. "unknown" while that is still loading, so nothing flickers in and out.
 * Members get the admin group. Everyone else gets one quiet "For business" link where they can create a workspace.
 */
export type WorkspaceState = "member" | "none" | "unknown";

const FOR_BUSINESS = { href: "/app/workspace/setup", label: "For business", icon: "rocket" } as const;

/** Grouped navigation for the rail and the mobile sheet. Staff and workspace entries appear only for the people allowed to use them. */
export function navGroups(roles: string[] = [], workspace: WorkspaceState = "unknown"): NavGroup[] {
  const groups = CUSTOMER_GROUPS.map((g) => {
    if (g.id !== "account") return g;
    const extra = [...(isStaff(roles) ? [STAFF_ITEM] : []), ...(workspace === "none" ? [FOR_BUSINESS] : [])];
    return extra.length ? { ...g, items: [...g.items, ...extra] } : g;
  });
  return workspace === "member" ? [...groups, WORKSPACE_GROUP] : groups;
}

/** Main navigation for the signed-in area. The Staff page is offered only to staff roles (the backend enforces access either way). */
export function mainNavLinks(roles: string[] = []): NavLink[] {
  return navGroups(roles)
    .filter((g) => g.id !== "workspace")
    .flatMap((g) => g.items.map(({ href, label }) => ({ href, label })));
}

export function adminNavLinks(workspace: WorkspaceState = "unknown"): NavLink[] {
  return workspace === "member" ? WORKSPACE_GROUP.items.map(({ href, label }) => ({ href, label })) : [];
}

/** Bottom tab bar on phones. Everything else lives in the More sheet. */
export const MOBILE_TAB_HREFS = ["/app", "/app/coach", "/app/score", "/app/simulate"];

/** The nav entry that matches the current path best (longest prefix), so /app/score/matrix highlights "Draft score" and not "Score". */
export function activeHref(pathname: string, hrefs: string[]): string | null {
  const match = hrefs.filter((h) => pathname === h || (h !== "/app" && pathname.startsWith(`${h}/`))).sort((a, b) => b.length - a.length);
  return match[0] ?? null;
}
