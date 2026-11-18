import Link from "next/link";

import { Badge, Card, buttonClass } from "@/design-system/ui";

/** Entry point on the home page. It does not calculate anything: opening the screen and pressing Calculate is the user's choice. */
export function MatrixScoreCard() {
  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">Your FinScore, 15 areas</h2>
        <Badge tone="demo">Draft rules</Badge>
      </div>
      <p className="text-sm text-muted">
        Fifteen areas of your finances, each compared with people of your age, added up to a score out of 900. Built from the business spreadsheets and
        not yet approved, so it is a draft.
      </p>
      <Link href="/app/score/matrix" className={buttonClass("secondary", "md", "w-fit")}>
        See my FinScore
      </Link>
    </Card>
  );
}
