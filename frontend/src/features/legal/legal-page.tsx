import Link from "next/link";

import { Card } from "@/design-system/ui";
import { BrandMark } from "@/features/shell/brand-mark";
import { TrackView } from "@/lib/telemetry";

import { LEGAL_UPDATED } from "./content";
import type { LegalDoc } from "./content";
import { SiteFooter } from "./site-footer";

/** Public legal page. Server-rendered and readable without an account. */
export function LegalPage({ doc }: { doc: LegalDoc }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-4 py-10">
      <Link href="/" className="w-fit rounded-xl" aria-label="FinScore AI home">
        <BrandMark />
      </Link>
      <main className="space-y-6">
        <header className="space-y-2">
          <h1 className="font-display text-3xl font-bold tracking-tight">{doc.title}</h1>
          <p className="text-sm text-muted">Last updated {LEGAL_UPDATED}</p>
          <p role="note" className="rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-sm">
            Draft, pending review by 5nance Legal. Details in [square brackets] are still to be confirmed.
          </p>
          <p className="text-muted">{doc.intro}</p>
        </header>
        <Card variant="solid" className="space-y-6">
          {doc.sections.map((s) => (
            <section key={s.heading} className="space-y-2">
              <h2 className="font-display text-lg font-semibold">{s.heading}</h2>
              {s.paragraphs?.map((p) => (
                <p key={p} className="text-sm leading-relaxed">
                  {p}
                </p>
              ))}
              {s.bullets ? (
                <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
                  {s.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </Card>
      </main>
      <SiteFooter />
      <TrackView name="legal_view" page={doc.slug} />
    </div>
  );
}
