"use client";

import Link from "next/link";

import { Card, buttonClass } from "@/design-system/ui";
import { ScoreRing } from "@/features/score/score-ring";

import { useMatrixScore } from "./hooks";

/** Home: the user's FinScore at a glance (the same number as the Score page and the coach). Nothing shows until there is one. */
export function MatrixScoreCard() {
  const { score } = useMatrixScore();
  if (!score) return null;
  const measured = Math.round(Number(score.confidence) * 100);
  return (
    <Card className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div className="w-full max-w-[260px]">
        <ScoreRing value={Number(score.overall)} stage="" provisional={false} early={score.early_estimate} min={0} caption={`${measured}% measured`} />
      </div>
      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Your FinScore</h2>
        <p className="text-sm text-muted">
          {Math.round(Number(score.overall))} out of 900, across fifteen areas of your finances compared with people your age.
          {measured < 100 ? " Answer more on your Money Map to make it firmer." : ""}
        </p>
        <Link href="/app/score" className={buttonClass("secondary", "md", "w-fit")}>
          See what drives it
        </Link>
      </div>
    </Card>
  );
}
