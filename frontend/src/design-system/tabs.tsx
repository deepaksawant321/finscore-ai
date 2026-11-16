"use client";

import { useRef } from "react";
import type { KeyboardEvent } from "react";

import { cx } from "./cx";

export type TabItem<T extends string = string> = { id: T; label: string };

/**
 * Segmented tab control. Arrow keys / Home / End move and select; only the selected tab is in the tab order.
 * The caller renders the panel (give it role="tabpanel" and aria-labelledby={`${idPrefix}-${id}`}).
 */
export function SegmentedTabs<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  idPrefix = "tab",
  className,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel: string;
  idPrefix?: string;
  className?: string;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const last = items.length - 1;
    const next = e.key === "ArrowRight" ? (i === last ? 0 : i + 1) : e.key === "ArrowLeft" ? (i === 0 ? last : i - 1) : e.key === "Home" ? 0 : e.key === "End" ? last : -1;
    const target = items[next];
    if (!target) return;
    e.preventDefault();
    onChange(target.id);
    refs.current[target.id]?.focus();
  };

  return (
    <div role="tablist" aria-label={ariaLabel} className={cx("glass inline-flex max-w-full gap-1 overflow-x-auto rounded-full p-1", className)}>
      {items.map((t, i) => {
        const selected = t.id === value;
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[t.id] = el;
            }}
            id={`${idPrefix}-${t.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => onKey(e, i)}
            className={cx(
              "min-h-[36px] whitespace-nowrap rounded-full px-4 text-sm font-semibold transition",
              selected ? "bg-nav-gradient text-white shadow-glow-ai" : "text-muted hover:text-ink",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
