import Link from "next/link";

import { Icon, buttonClass } from "@/design-system/ui";
import { SiteFooter } from "@/features/legal/site-footer";
import { BrandMark } from "@/features/shell/brand-mark";
import { TrackView } from "@/lib/telemetry";

const TRUST: { icon: "lock" | "shield" | "check"; text: string }[] = [
  { icon: "lock", text: "Bank-grade encryption" },
  { icon: "shield", text: "You control what we store" },
  { icon: "check", text: "AI explains. Engines calculate." },
];

export default function Landing() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-4 py-16">
      <BrandMark />
      <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl">
        What is the <span className="bg-gradient-to-r from-brand-strong to-ai bg-clip-text text-transparent">one money problem</span> you want to solve right now?
      </h1>
      <p className="max-w-xl text-lg text-muted">
        FinScore AI starts with a conversation, not a questionnaire. Understand your financial life, see where you stand, and know the next best
        action.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/register" className={buttonClass("primary")}>
          Get started
        </Link>
        <Link href="/login" className={buttonClass("secondary")}>
          Log in
        </Link>
      </div>
      <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
        {TRUST.map((t) => (
          <li key={t.text} className="flex items-center gap-2">
            <Icon name={t.icon} size={16} /> {t.text}
          </li>
        ))}
      </ul>
      <SiteFooter />
      <TrackView name="landing_view" />
    </main>
  );
}
