import { CONNECTORS, MODULES, ROLE_LABEL } from "./catalogue";
import type { ModuleId, RoleId } from "./catalogue";
import type { Activity, BrandingBody, Plan } from "./api";
import type { WorkspaceTheme } from "@/lib/theme/tenant-theme";

export type SnippetKind = "embed" | "api" | "sdk";

/** The server decides which steps are done. This only adds the words and the place to go. */
const CHECKLIST_COPY: Record<string, { title: string; detail: string; cta?: { label: string; href: string } }> = {
  workspace: { title: "Create your workspace", detail: "Name, region and data residency (India)" },
  sandbox_key: { title: "Create a sandbox API key", detail: "Test keys are ready. Live keys unlock at go-live." },
  data_source: { title: "Connect a data source", detail: "Account Aggregator, brokerage or file upload", cta: { label: "Connect", href: "/app/workspace/integrations" } },
  branding: { title: "Brand your widget", detail: "Pick colours and a name, then save", cta: { label: "Customise", href: "/app/workspace/branding" } },
  snippet: { title: "Embed the snippet", detail: "Paste one script tag into your app or site", cta: { label: "Get snippet", href: "/app/workspace/integrations" } },
};

export type ChecklistView = { id: string; title: string; detail: string; done: boolean; cta?: { label: string; href: string } };

export function checklistView(items: { id: string; done: boolean }[]): ChecklistView[] {
  return items.map((i) => ({ id: i.id, done: i.done, ...(CHECKLIST_COPY[i.id] ?? { title: i.id, detail: "" }) }));
}
export const remainingSteps = (items: { done: boolean }[]): number => items.filter((i) => !i.done).length;
export const canGoLive = (items: { done: boolean }[]): boolean => remainingSteps(items) === 0;

export const slugify = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "workspace";

/** Enabled modules in catalogue order, ignoring any id the UI does not know. */
export function enabledModules(ids: string[]): ModuleId[] {
  const on = new Set(ids);
  return MODULES.filter((m) => on.has(m.id)).map((m) => m.id);
}

export const seatsLeft = (used: number, limit: number | null | undefined): number | null => (limit == null ? null : Math.max(0, limit - used));

export type SnippetOptions = { slug: string; modules: ModuleId[]; publishableKey?: string; apiBase?: string; cdn?: string };

/**
 * Copy-paste integration samples. The REST call is real (`POST /api/v1/partner/scores`). The hosted widget script and the React SDK
 * are not published yet, so their hosts are placeholders (`*.example`) and the page says so.
 */
export function snippet(kind: SnippetKind, o: SnippetOptions): string {
  const cdn = o.cdn ?? "https://cdn.finscore.example";
  const base = o.apiBase ?? "https://api.finscore.example";
  const key = o.publishableKey ?? "fs_pub_test_YOUR_KEY";
  if (kind === "embed")
    return `<!-- 1. Paste before </body> -->
<script src="${cdn}/v1/widget.js" async></script>

<!-- 2. Place it where the widget should appear -->
<div data-finscore
     data-workspace="${o.slug}"
     data-key="${key}"
     data-modules="${o.modules.join(",")}"
     data-user-token="{{SIGNED_USER_TOKEN}}"></div>`;
  if (kind === "api")
    return `# Get a score from the facts you hold about one customer.
# Nothing about the customer is stored by FinScore.
curl -X POST ${base}/api/v1/partner/scores \\
  -H "Authorization: Bearer $FINSCORE_SECRET_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"facts": {"age": 32, "annual_income": 1200000, "monthly_expenses": 50000, "liquid_assets": 300000}}'

# Example response (200), shortened
{ "overall": "777.00", "confidence": "0.1500", "early_estimate": true,
  "stage": null, "official": false, "environment": "test" }`;
  return `# npm i @finscore/react   (not published yet)
import { FinScore, FinScoreProvider } from "@finscore/react";

export default function Wealth({ userToken }) {
  return (
    <FinScoreProvider workspace="${o.slug}" publicKey="${key}">
      <FinScore userToken={userToken} modules={[${o.modules.map((m) => `"${m}"`).join(", ")}]} />
    </FinScoreProvider>
  );
}`;
}

/** Plain-language lines for a plan card, built from the numbers the API returns so they cannot drift from what is enforced. */
export function planFeatures(p: Plan, inr: (n: number) => string): string[] {
  if (p.key === "enterprise") return [];
  const out: string[] = [];
  out.push(p.scores_per_month == null ? "Volume pricing" : `${p.scores_per_month.toLocaleString("en-IN")} scores a month`);
  out.push(p.live_allowed ? "Live environment" : "Sandbox only");
  if (p.modules != null) out.push(`${p.modules} module${p.modules === 1 ? "" : "s"}`);
  if (p.seats != null) out.push(`${p.seats} seat${p.seats === 1 ? "" : "s"}`);
  if (Number(p.overage_per_score) > 0) out.push(`Overage ${inr(Number(p.overage_per_score))} per score`);
  else if (p.scores_per_month != null) out.push("Stops at the monthly limit");
  return out;
}

const ACTIONS: Record<string, (a: Activity) => string> = {
  "org.created": () => "created the workspace",
  "org.renamed": () => "renamed the workspace",
  "branding.updated": () => "saved the branding",
  "branding.reset": () => "reset the branding",
  "modules.updated": () => "changed the modules",
  "connector.connected": (a) => `connected ${connector(a.meta.connector)}`,
  "connector.disconnected": (a) => `disconnected ${connector(a.meta.connector)}`,
  "env.live": () => "switched the workspace to Live",
  "env.sandbox": () => "switched the workspace back to Sandbox",
  "member.invited": (a) => `invited someone as ${role(a.meta.role)}`,
  "member.joined": (a) => `joined as ${role(a.meta.role)}`,
  "member.role_changed": (a) => `changed a role to ${role(a.meta.role)}`,
  "member.removed": () => "removed a person",
  "apikey.rotated": (a) => `rotated the ${envName(a.meta.environment)} secret key`,
  "apikey.revoked": (a) => `revoked a ${envName(a.meta.environment)} ${label(a.meta.kind)} key`,
  "plan.upgraded": (a) => `moved to the ${label(a.meta.plan)} plan`,
  "plan.downgrade_scheduled": (a) => `scheduled a change to the ${label(a.meta.plan)} plan`,
  "plan.downgraded": (a) => `moved to the ${label(a.meta.plan)} plan`,
  "invoice.issued": (a) => `issued the invoice for ${label(a.meta.period)}`,
  "sales.requested": () => "asked to talk to sales",
};
const label = (v: unknown): string => (typeof v === "string" ? v : "");
const connector = (v: unknown): string => CONNECTORS.find((c) => c.id === v)?.name ?? label(v);
const role = (v: unknown): string => ROLE_LABEL[v as RoleId] ?? label(v);
const envName = (v: unknown): string => (v === "test" ? "sandbox" : label(v));

/** One readable line for the activity list. Unknown actions fall back to their code so nothing is silently hidden. */
export function activityText(a: Activity): string {
  const who = a.actor_email ?? "Someone";
  const what = ACTIONS[a.action]?.(a) ?? a.action;
  return `${who} ${what}`;
}

export function themeFromBranding(b: Record<string, unknown> | null | undefined): Partial<WorkspaceTheme> | null {
  if (!b) return null;
  return { name: String(b.name ?? ""), brand: String(b.brand ?? ""), accent: String(b.accent ?? ""), radius: Number(b.radius ?? 24), font: b.font as WorkspaceTheme["font"], poweredBy: b.powered_by !== false };
}

export function brandingFromTheme(t: WorkspaceTheme): BrandingBody {
  return { name: t.name, brand: t.brand, accent: t.accent, radius: t.radius, font: t.font, powered_by: t.poweredBy };
}

export function sameBranding(a: BrandingBody, b: Record<string, unknown> | null | undefined): boolean {
  return !!b && a.name === b.name && String(a.brand).toLowerCase() === String(b.brand).toLowerCase() && String(a.accent).toLowerCase() === String(b.accent).toLowerCase() && a.radius === b.radius && a.font === b.font && a.powered_by === (b.powered_by !== false);
}
