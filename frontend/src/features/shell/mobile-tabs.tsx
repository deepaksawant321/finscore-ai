"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Icon } from "@/design-system/ui";
import { MOBILE_TAB_HREFS, activeHref } from "@/lib/nav";
import type { NavGroup } from "@/lib/nav";

import { ThemeToggle } from "./topbar";

/** Phone navigation: a floating tab bar with four destinations and a More sheet for the rest. Hidden from the lg breakpoint up. */
export function MobileTabs({ groups, onLogout }: { groups: NavGroup[]; onLogout: () => void }) {
  const pathname = usePathname() ?? "";
  const [more, setMore] = useState(false);
  const items = groups.flatMap((g) => g.items);
  const tabs = MOBILE_TAB_HREFS.map((h) => items.find((i) => i.href === h)).filter((i): i is NonNullable<typeof i> => !!i);
  const current = activeHref(pathname, items.map((i) => i.href));
  const inMore = !!current && !MOBILE_TAB_HREFS.includes(current);

  useEffect(() => setMore(false), [pathname]);
  useEffect(() => {
    if (!more) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMore(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [more]);

  const tab = "flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold";
  return (
    <>
      <nav
        aria-label="Tabs"
        className="glass fixed inset-x-3 z-30 grid grid-cols-5 rounded-[26px] p-1.5 shadow-card lg:hidden"
        style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
      >
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} aria-current={t.href === current ? "page" : undefined} className={`${tab} ${t.href === current ? "text-brand-strong" : "text-muted"}`}>
            <span className={t.href === current ? "rounded-xl bg-brand-soft px-3 py-0.5" : "px-3 py-0.5"}>
              <Icon name={t.icon} size={22} />
            </span>
            {t.label}
          </Link>
        ))}
        <button type="button" onClick={() => setMore(true)} aria-haspopup="dialog" aria-expanded={more} className={`${tab} ${inMore ? "text-brand-strong" : "text-muted"}`}>
          <span className={inMore ? "rounded-xl bg-brand-soft px-3 py-0.5" : "px-3 py-0.5"}>
            <Icon name="more" size={22} />
          </span>
          More
        </button>
      </nav>

      {more ? (
        <div className="fixed inset-0 z-40 flex items-end bg-black/45 lg:hidden" onClick={(e) => e.target === e.currentTarget && setMore(false)}>
          <div role="dialog" aria-modal="true" aria-label="More" className="max-h-[80vh] w-full overflow-y-auto rounded-t-[24px] bg-surface p-4" style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">More</p>
              <button type="button" onClick={() => setMore(false)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-surface-2" aria-label="Close">
                <Icon name="x" size={18} />
              </button>
            </div>
            {groups.map((g) => {
              const rest = g.items.filter((i) => !MOBILE_TAB_HREFS.includes(i.href));
              if (!rest.length) return null;
              return (
                <div key={g.id} className="mb-3">
                  <p className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.09em] text-muted">{g.label}</p>
                  <ul className="grid grid-cols-2 gap-2">
                    {rest.map((i) => (
                      <li key={i.href}>
                        <Link href={i.href} aria-current={i.href === current ? "page" : undefined} className="flex min-h-[44px] items-center gap-2 rounded-xl border border-line px-3 text-sm font-medium">
                          <Icon name={i.icon} size={18} /> {i.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
            <div className="mt-2 flex items-center gap-2">
              <ThemeToggle className="grid h-11 w-11 place-items-center rounded-xl border border-line" />
              <button type="button" onClick={onLogout} className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-line text-sm font-semibold">
                <Icon name="x" size={16} /> Log out
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
