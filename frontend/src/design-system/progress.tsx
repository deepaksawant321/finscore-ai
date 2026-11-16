import { cx } from "./cx";

/** Horizontal meter. `value` is 0–100. Decorative unless `label` is given (then it is exposed as a progressbar). */
export function ProgressBar({ value, label, tone = "brand", className }: { value: number; label?: string; tone?: "brand" | "ai" | "warn"; className?: string }) {
  const v = Math.max(0, Math.min(100, value));
  const fill = { brand: "bg-gradient-to-r from-brand to-brand/60", ai: "bg-ai", warn: "bg-warn" }[tone];
  return (
    <div
      className={cx("h-2 overflow-hidden rounded-full bg-surface-2", className)}
      {...(label ? { role: "progressbar", "aria-label": label, "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": Math.round(v) } : { "aria-hidden": true })}
    >
      <div className={cx("h-full rounded-full transition-[width] duration-700 ease-out", fill)} style={{ width: `${v}%` }} />
    </div>
  );
}
