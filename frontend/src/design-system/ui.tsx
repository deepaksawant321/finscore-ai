import { forwardRef, useId } from "react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
};

export function Button({ variant = "primary", loading, className, children, disabled, ...rest }: ButtonProps) {
  const styles = {
    primary: "bg-brand text-brand-ink hover:brightness-95",
    secondary: "bg-surface text-ink border border-line hover:bg-surface-2",
    ghost: "text-ink hover:bg-surface-2",
    danger: "bg-negative text-white hover:brightness-95",
  }[variant];
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition",
        "disabled:cursor-not-allowed disabled:opacity-60",
        styles,
        className,
      )}
    >
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
          "min-h-[44px] w-full rounded-md border bg-surface px-3 text-sm placeholder:text-muted",
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

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cx("rounded-xl border border-line bg-surface p-6 shadow-card", className)}>{children}</section>;
}

export function Alert({ tone = "info", children }: { tone?: "info" | "error" | "success"; children: ReactNode }) {
  const t = { info: "border-ai/40 bg-ai/10", error: "border-negative/40 bg-negative/10", success: "border-positive/40 bg-positive/10" }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cx("rounded-md border px-3 py-2 text-sm", t)}>
      {children}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "demo" | "positive" }) {
  const t = { neutral: "bg-surface-2 text-muted", demo: "bg-warn/15 text-warn", positive: "bg-positive/15 text-positive" }[tone];
  return <span className={cx("rounded-full px-2.5 py-0.5 text-xs font-semibold", t)}>{children}</span>;
}
