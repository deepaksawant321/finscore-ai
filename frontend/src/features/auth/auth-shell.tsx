import Link from "next/link";
import type { ReactNode } from "react";

import { Card } from "@/design-system/ui";
import { SiteFooter } from "@/features/legal/site-footer";
import { BrandMark } from "@/features/shell/brand-mark";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4 py-12">
      <Link href="/" className="w-fit rounded-xl" aria-label="FinScore AI home">
        <BrandMark />
      </Link>
      <Card className="space-y-5">
        <header className="space-y-1">
          <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
        </header>
        {children}
      </Card>
      <SiteFooter />
    </main>
  );
}
