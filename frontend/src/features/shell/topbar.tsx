"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Icon } from "@/design-system/ui";
import type { User } from "@/features/auth/auth-context";
import { useIsDark, useWorkspaceTheme } from "@/lib/theme/theme-provider";

const ghost = "grid h-10 w-10 place-items-center rounded-full glass text-ink hover:border-brand";

export function ThemeToggle({ className }: { className?: string }) {
  const { setMode } = useWorkspaceTheme();
  const dark = useIsDark();
  return (
    <button type="button" onClick={() => setMode(dark ? "light" : "dark")} className={className ?? ghost} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}>
      <Icon name={dark ? "sun" : "moon"} size={18} />
    </button>
  );
}

const initialsOf = (user: User): string => {
  const base = (user.full_name || user.email || "?").trim();
  const words = base.split(/[\s@.]+/).filter(Boolean);
  return (words.slice(0, 2).map((w) => w[0]).join("") || "?").toUpperCase();
};

function AccountMenu({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${user.email}`}
        className="grid h-10 w-10 place-items-center rounded-full bg-ai-soft text-sm font-bold text-ai"
      >
        {initialsOf(user)}
      </button>
      {open ? (
        <div role="menu" className="glass absolute right-0 top-12 z-30 w-64 rounded-xl p-2 shadow-card">
          <p className="truncate px-3 py-2 text-sm text-muted">{user.email}</p>
          <Link role="menuitem" href="/app/settings" onClick={() => setOpen(false)} className="flex min-h-[40px] items-center gap-2 rounded-lg px-3 text-sm font-medium hover:bg-surface-2">
            <Icon name="cog" size={16} /> Settings
          </Link>
          <button role="menuitem" type="button" onClick={onLogout} className="flex min-h-[40px] w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-medium hover:bg-surface-2">
            <Icon name="x" size={16} /> Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Top bar: jump to the coach, light/dark and the account menu. */
export function Topbar({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <header className="flex items-center gap-3 px-4 py-3 lg:px-8">
      <Link href="/app/coach" className="glass hidden min-h-[44px] max-w-md flex-1 items-center gap-2.5 rounded-full px-4 text-sm text-muted hover:border-brand sm:flex">
        <Icon name="search" size={18} />
        Ask your coach anything…
      </Link>
      <span className="flex-1 sm:hidden" />
      <ThemeToggle />
      <AccountMenu user={user} onLogout={onLogout} />
    </header>
  );
}
