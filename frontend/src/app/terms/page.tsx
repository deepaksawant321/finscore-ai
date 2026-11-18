import type { Metadata } from "next";

import { TERMS } from "@/features/legal/content";
import { LegalPage } from "@/features/legal/legal-page";

export const metadata: Metadata = { title: "Terms of Use · FinScore AI by 5nance" };

export default function Page() {
  return <LegalPage doc={TERMS} />;
}
