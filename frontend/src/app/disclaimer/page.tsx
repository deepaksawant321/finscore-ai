import type { Metadata } from "next";

import { DISCLAIMER } from "@/features/legal/content";
import { LegalPage } from "@/features/legal/legal-page";

export const metadata: Metadata = { title: "Disclaimer · FinScore AI by 5nance" };

export default function Page() {
  return <LegalPage doc={DISCLAIMER} />;
}
