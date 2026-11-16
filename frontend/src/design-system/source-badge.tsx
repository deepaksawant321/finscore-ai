import { cx } from "./cx";
import { Icon } from "./icons";
import type { IconName } from "./icons";

/**
 * Where a fact came from (UI_UX_GUIDELINES §5). Always shown with an icon and text, never colour alone.
 * Mirrors the backend `source_type` values: USER_STATED, CONNECTED, DERIVED, INFERRED, ESTIMATED.
 */
export type FactSource = "user" | "connected" | "derived" | "inferred" | "estimated";

const SOURCES: Record<FactSource, { label: string; icon: IconName; tone: string }> = {
  user: { label: "You told me", icon: "user", tone: "bg-surface-2 text-muted" },
  connected: { label: "Connected account", icon: "link", tone: "bg-positive/15 text-positive" },
  derived: { label: "Calculated", icon: "sim", tone: "bg-brand-soft text-brand-strong" },
  inferred: { label: "Inferred", icon: "spark", tone: "bg-ai/15 text-ai" },
  estimated: { label: "Estimated", icon: "approx", tone: "bg-warn/15 text-warn" },
};

export function SourceBadge({ source, className }: { source: FactSource; className?: string }) {
  const s = SOURCES[source];
  return (
    <span className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold", s.tone, className)}>
      <Icon name={s.icon} size={12} />
      {s.label}
    </span>
  );
}

/** Maps the backend `source_type` (or similar free text) to a badge, defaulting to "You told me". */
export function sourceFromApi(value: string | null | undefined): FactSource {
  const v = (value ?? "").toLowerCase();
  if (v === "derived" || v.includes("calculat")) return "derived";
  if (v.includes("connect") || v.includes("bank") || v.includes("aggregat")) return "connected";
  if (v.includes("infer")) return "inferred";
  if (v.includes("estimat")) return "estimated";
  return "user";
}
