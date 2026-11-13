import Link from "next/link";
import type { ReactNode } from "react";

import { Card } from "@/design-system/ui";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4 py-12">
      <Link href="/" className="text-sm font-semibold uppercase tracking-widest text-brand">
        5nance · FinScore AI
      </Link>
      <Card className="space-y-5">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
        </header>
        {children}
      </Card>
    </main>
  );
}
