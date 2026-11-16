import { forwardRef, useId } from "react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

import { cx } from "./cx";

export { CodeBlock } from "./code-block";
export { Icon } from "./icons";
export type { IconName } from "./icons";
export { ProgressBar } from "./progress";
export { SegmentedTabs } from "./tabs";
export type { TabItem } from "./tabs";
export { SourceBadge, sourceFromApi } from "./source-badge";
export type { FactSource } from "./source-badge";
export { Stat } from "./stat";
export { Switch } from "./switch";
export { ToastProvider, useToast } from "./toast";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "ai";
  size?: "md" | "sm";
  loading?: boolean;
};

/** Class names for a button look, so links (`<Link>`) can share the exact same styling as `<Button>`. */
export function buttonClass(variant: NonNullable<ButtonProps["variant"]> = "primary", size: NonNullable<ButtonProps["size"]> = "md", extra?: string) {
  const styles = {
    primary: "bg-brand-gradient text-brand-ink shadow-glow hover:-translate-y-px",
    secondary: "glass text-ink hover:bg-surface-2",
    ghost: "text-ink hover:bg-surface-2",
    danger: "bg-negative text-white hover:brightness-95",
    ai: "bg-ai-gradient text-white shadow-glow-ai hover:-translate-y-px",
  }[variant];
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition",
    size === "sm" ? "min-h-[36px] px-3.5" : "min-h-[44px] px-5",
    "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0",
    styles,
    extra,
  );
}

export function Button({ variant = "primary", size = "md", loading, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button {...rest} disabled={disabled || loading} aria-busy={loading || undefined} className={buttonClass(variant, size, className)}>
      {loading ? "Please wait…" : children}
    </button>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, error, hint, className, id, ...rest }, ref) {
  const auto = useId();
  const inputId = id ?? auto;
  const describedBy = error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="text-sm font-medium">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cx(
          "min-h-[44px] w-full rounded-lg border bg-surface px-3.5 text-sm placeholder:text-muted focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/20",
          error ? "border-negative" : "border-line",
          className,
        )}
        {...rest}
      />
      {error ? (
        <p id={`${inputId}-err`} className="text-sm text-negative">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

/**
 * Surface container. `glass` (default) is the frosted card; `solid` is the previous opaque card;
 * `flat` has no shadow (use inside another card); `dark` is the glowing hero surface used for the score.
 */
export function Card({ children, className, variant = "glass" }: { children: ReactNode; className?: string; variant?: "glass" | "solid" | "flat" | "dark" }) {
  const v = {
    glass: "glass shadow-card",
    solid: "border border-line bg-surface shadow-card",
    flat: "border border-line bg-surface",
    dark: "card-dark",
  }[variant];
  return <section className={cx("rounded-xl p-6", v, className)}>{children}</section>;
}

export function Alert({ tone = "info", children }: { tone?: "info" | "error" | "success"; children: ReactNode }) {
  const t = { info: "border-ai/40 bg-ai/10", error: "border-negative/40 bg-negative/10", success: "border-positive/40 bg-positive/10" }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cx("rounded-lg border px-3.5 py-2.5 text-sm", t)}>
      {children}
    </div>
  );
}

export type BadgeTone = "neutral" | "demo" | "positive" | "ai" | "warn" | "negative" | "brand";

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: BadgeTone; className?: string }) {
  const t: Record<BadgeTone, string> = {
    neutral: "bg-surface-2 text-muted",
    demo: "bg-warn/15 text-warn",
    warn: "bg-warn/15 text-warn",
    positive: "bg-positive/15 text-positive",
    negative: "bg-negative/15 text-negative",
    ai: "bg-ai/15 text-ai",
    brand: "bg-brand-soft text-brand-strong",
  };
  return <span className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold", t[tone], className)}>{children}</span>;
}

/** Marks anything that is sample data rather than the user's or workspace's real data. */
export function DemoBadge({ children = "Demo data" }: { children?: ReactNode }) {
  return <Badge tone="demo">{children}</Badge>;
}
