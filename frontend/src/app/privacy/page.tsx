import type { Metadata } from "next";

import { PRIVACY } from "@/features/legal/content";
import { LegalPage } from "@/features/legal/legal-page";

export const metadata: Metadata = { title: "Privacy Notice · FinScore AI by 5nance" };

export default function Page() {
  return <LegalPage doc={PRIVACY} />;
}
