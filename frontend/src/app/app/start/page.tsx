import { redirect } from "next/navigation";

/** The one-screen quick score became the first chapter of the Money Map (2026-11-18). Old links still work. */
export default function QuickStartPage() {
  redirect("/app/journey");
}
