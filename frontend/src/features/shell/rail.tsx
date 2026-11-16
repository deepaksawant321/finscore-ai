"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon } from "@/design-system/ui";
import { activeHref } from "@/lib/nav";
import type { NavGroup } from "@/lib/nav";

import { BrandMark } from "./brand-mark";

/** Desktop navigation: a floating glass rail with grouped links. The group heading is a plain label, links keep their text. */
export function Rail({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname() ?? "";
  const current = activeHref(pathname, groups.flatMap((g) => g.items.map((i) => i.href)));

  return (
    <aside className="glass sticky top-3 m-3 hidden h-[calc(100vh-1.5rem)] flex-col rounded-[28px] p-3 shadow-card lg:flex">
      <Link href="/app" className="rounded-xl px-2 py-3" aria-label="Workspace home">
        <BrandMark />
      </Link>
      <nav aria-label="Main" className="mt-1 flex-1 space-y-4 overflow-y-auto pr-0.5">
        {groups.map((g) => (
          <div key={g.id}>
            <p className="px-3 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-[0.09em] text-muted">{g.label}</p>
            <ul className="space-y-0.5">
              {g.items.map((item) => {
                const active = item.href === current;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={
                        active
                          ? "flex min-h-[40px] items-center gap-3 rounded-2xl bg-nav-gradient px-3 text-sm font-semibold text-white shadow-glow-ai"
                          : "flex min-h-[40px] items-center gap-3 rounded-2xl px-3 text-sm font-medium text-muted transition hover:bg-surface-2 hover:text-ink"
                      }
                    >
                      <Icon name={item.icon} size={18} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
