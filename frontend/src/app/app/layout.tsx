"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";

import { Button } from "@/design-system/ui";
import { useAuth } from "@/features/auth/auth-context";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const { user, status, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated" || !user)
    return (
      <main className="grid min-h-screen place-items-center text-muted" aria-busy="true">
        Loading…
      </main>
    );

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-surface">
        <nav className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3" aria-label="Main">
          <Link href="/app" className="font-bold">
            <span className="text-brand">5nance</span> FinScore AI
          </Link>
          <div className="flex items-center gap-2">
            {[
              ["/app/interview", "Talk"],
              ["/app/score", "Score"],
              ["/app/dna", "DNA"],
              ["/app/goals", "Goals"],
              ["/app/memory", "Memory"],
              ["/app/settings", "Settings"],
            ].map(([href, label]) => (
              <Link key={href} href={href as string} className="rounded-md px-3 py-2 text-sm hover:bg-surface-2">
                {label}
              </Link>
            ))}
            <Button
              variant="secondary"
              onClick={async () => {
                await logout();
                router.replace("/login");
              }}
            >
              Log out
            </Button>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
