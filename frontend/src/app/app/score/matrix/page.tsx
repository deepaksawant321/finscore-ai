import { redirect } from "next/navigation";

/** Old address of the FinScore page (before the workbook score became the only FinScore). Kept so saved links still work. */
export default function OldMatrixScorePage() {
  redirect("/app/score");
}
