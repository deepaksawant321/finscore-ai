import Link from "next/link";

export default function Landing() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-4 py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-brand">5nance · FinScore AI</p>
      <h1 className="text-4xl font-bold leading-tight sm:text-5xl">What is the one money problem you want to solve right now?</h1>
      <p className="max-w-xl text-lg text-muted">
        FinScore AI starts with a conversation, not a questionnaire. Understand your financial life, see where you stand, and know the next best
        action.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/register" className="inline-flex min-h-[44px] items-center rounded-md bg-brand px-5 text-sm font-semibold text-brand-ink">
          Get started
        </Link>
        <Link href="/login" className="inline-flex min-h-[44px] items-center rounded-md border border-line bg-surface px-5 text-sm font-semibold">
          Log in
        </Link>
      </div>
      <p className="text-xs text-muted">
        Platform foundation build (MVP 1). The AI interview and FinScore are not available yet and no financial score is shown until the official
        scoring rules are approved.
      </p>
    </main>
  );
}
