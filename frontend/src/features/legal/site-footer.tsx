import Link from "next/link";

/** Footer for public pages: who we are and the legal pages, reachable before anyone signs up. */
export function SiteFooter() {
  return (
    <footer className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-4 text-xs text-muted">
      <span>© 2026 [5nance legal entity name]</span>
      <Link href="/privacy" className="underline hover:text-ink">
        Privacy Notice
      </Link>
      <Link href="/terms" className="underline hover:text-ink">
        Terms of Use
      </Link>
      <Link href="/disclaimer" className="underline hover:text-ink">
        Disclaimer
      </Link>
      <span>Education only, not investment advice.</span>
    </footer>
  );
}
