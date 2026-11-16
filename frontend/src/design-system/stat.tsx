import type { ReactNode } from "react";

import { cx } from "./cx";

/** Small labelled figure. Used for KPI tiles and the confidence / trend rows on the score card. */
export function Stat({ label, value, hint, className }: { label: string; value: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <div className={cx("glass rounded-xl p-5", className)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-muted">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold tabular-nums">{value}</p>
      {hint ? <p className="mt-1.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
