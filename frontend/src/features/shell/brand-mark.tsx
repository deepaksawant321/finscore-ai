"use client";

import { initials } from "@/lib/theme/tenant-theme";
import { useWorkspaceTheme } from "@/lib/theme/theme-provider";

/** Workspace logo and name. White-label: shows the workspace theme's name, with a small "Powered by 5nance" line when enabled. */
export function BrandMark({ showPowered = true }: { showPowered?: boolean }) {
  const { theme } = useWorkspaceTheme();
  return (
    <span className="flex min-w-0 items-center gap-3">
      <span
        aria-hidden="true"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-gradient-to-br from-brand to-ai font-display text-[13px] font-bold text-white shadow-glow-ai"
      >
        {initials(theme.name)}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-display text-base font-bold leading-tight">{theme.name}</span>
        {showPowered ? <span className="block text-[11px] font-medium text-muted">{theme.poweredBy && theme.name !== "5nance" ? "Powered by 5nance" : "FinScore AI"}</span> : null}
      </span>
    </span>
  );
}
