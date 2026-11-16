"use client";

import type { ReactNode } from "react";

import { Badge } from "@/design-system/ui";
import { ScoreRing } from "@/features/score/score-ring";
import { initials } from "@/lib/theme/tenant-theme";
import { useWorkspaceTheme } from "@/lib/theme/theme-provider";

import { MODULES } from "./catalogue";
import { slugify } from "./logic";
import { useWorkspace } from "./workspace-store";

/** Browser-style frame around a preview. The address is a placeholder host. */
export function BrowserFrame({ children }: { children: ReactNode }) {
  const { theme } = useWorkspaceTheme();
  return (
    <section aria-label="Live preview" className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
      <div className="flex items-center gap-1.5 border-b border-line bg-surface-2 px-4 py-2.5">
        <i className="h-2.5 w-2.5 rounded-full bg-line" />
        <i className="h-2.5 w-2.5 rounded-full bg-line" />
        <i className="h-2.5 w-2.5 rounded-full bg-line" />
        <span className="ml-3 flex-1 truncate rounded-full bg-surface px-3 py-0.5 text-xs text-muted">app.{slugify(theme.name)}.example</span>
      </div>
      <div className="bg-gradient-to-b from-surface-2 to-surface p-5">{children}</div>
    </section>
  );
}

/** What the workspace's customers would see embedded in the host product. The score shown is an example, not anyone's data. */
export function WidgetPreview() {
  const { theme } = useWorkspaceTheme();
  const { org } = useWorkspace();
  const on = MODULES.filter((m) => org.modules.includes(m.id));
  return (
    <div className="mx-auto max-w-sm overflow-hidden rounded-xl border border-line bg-surface shadow-card">
      <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-brand to-ai font-display text-[11px] font-bold text-white">{initials(theme.name)}</span>
        <b className="min-w-0 flex-1 truncate font-display">{theme.name}</b>
        <Badge tone="brand">Your FinScore</Badge>
      </div>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 p-4">
        <div className="relative h-[154px] w-[170px]">
          <div className="w-[260px] origin-top-left scale-[0.654]">
            <ScoreRing value={684} stage="Accumulation" provisional={false} />
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <p className="text-xs font-semibold text-warn">Example score</p>
          <div className="flex justify-between">
            <span className="text-muted">Confidence</span>
            <b className="tabular-nums">78%</b>
          </div>
          <span className="mt-1 flex min-h-[36px] items-center justify-center rounded-full bg-brand-gradient px-3 text-sm font-semibold text-brand-ink shadow-glow">See my plan</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 px-4 pb-3">
        {on.length ? on.map((m) => <Badge key={m.id} tone="brand">{m.short}</Badge>) : <span className="text-sm text-muted">Turn on a module to show it here</span>}
      </div>
      {theme.poweredBy ? <p className="border-t border-line px-4 py-2 text-center text-[11.5px] text-muted">Powered by 5nance</p> : null}
    </div>
  );
}
