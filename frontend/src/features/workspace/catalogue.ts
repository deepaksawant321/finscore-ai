/**
 * Static catalogue text for the workspace admin screens. Everything that changes (plan, members, keys, usage, invoices, checklist)
 * comes from the organisation API. These lists only describe the options a workspace can choose from, and the ids match the backend
 * (`app/domains/organizations/plans.py`).
 */
import type { IconName } from "@/design-system/ui";

export type ModuleId = "score" | "coach" | "sim" | "dna" | "goals";
export const MODULES: { id: ModuleId; name: string; short: string; description: string }[] = [
  { id: "score", name: "FinScore & explainability", short: "Score", description: "Score, drivers, confidence" },
  { id: "coach", name: "AI Wealth Coach", short: "Coach", description: "Grounded Q&A in four modes" },
  { id: "sim", name: "What-if simulator", short: "What-if", description: "Scenarios with ranges" },
  { id: "dna", name: "Financial DNA & persona", short: "DNA", description: "Habits and traits" },
  { id: "goals", name: "Goals & timeline", short: "Goals", description: "Goal builder and projections" },
];

export type ConnectorId = "aa" | "brokerage" | "upload" | "crm";
export const CONNECTORS: { id: ConnectorId; name: string; description: string; icon: IconName }[] = [
  { id: "aa", name: "Account Aggregator", description: "RBI-regulated bank data, shared with the customer's consent", icon: "bank" },
  { id: "brokerage", name: "Brokerage and mutual-fund holdings", description: "Demat and fund statements", icon: "up" },
  { id: "upload", name: "CSV or API upload", description: "Push your own customer data", icon: "copy" },
  { id: "crm", name: "CRM sync", description: "Pull profile details from your CRM", icon: "users" },
];

export type RoleId = "owner" | "admin" | "analyst" | "viewer";
export const ROLE_LABEL: Record<RoleId, string> = { owner: "Owner", admin: "Admin", analyst: "Analyst", viewer: "Viewer" };
export const ROLE_ORDER: RoleId[] = ["owner", "admin", "analyst", "viewer"];
export const ASSIGNABLE_ROLES: Exclude<RoleId, "owner">[] = ["admin", "analyst", "viewer"];

/** Rows: permission. Columns follow ROLE_ORDER. Mirrors `PERMISSIONS` in the backend plans module. */
export const PERMISSIONS: [string, boolean, boolean, boolean, boolean][] = [
  ["Manage billing and plan", true, true, false, false],
  ["Edit branding and modules", true, true, false, false],
  ["Create and rotate API keys", true, true, false, false],
  ["View customer scores", true, true, true, true],
  ["Export customer data", true, true, true, false],
  ["Invite and remove people", true, true, false, false],
];

/** Plan marketing copy. Prices and limits are shown from the API; only the descriptions live here. */
export const PLAN_BLURB: Record<string, string> = {
  starter: "Build and test in a sandbox.",
  growth: "Launch to your customers.",
  enterprise: "Scale with controls and SLAs.",
};
export const ENTERPRISE_FEATURES = ["Volume pricing", "Remove “Powered by”, custom domain", "SSO, audit export, data residency", "99.9% SLA and a named manager", "Private rulebook configuration"];
