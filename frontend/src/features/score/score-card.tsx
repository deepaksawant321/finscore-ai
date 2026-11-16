import Link from "next/link";

import { Badge, Card, ProgressBar, buttonClass } from "@/design-system/ui";
import type { useCurrentScore } from "@/features/score/hooks";

import { ScoreRing } from "./score-ring";
import { StageLadder } from "./stage-ladder";

type Run = NonNullable<ReturnType<typeof useCurrentScore>["data"]>;

const sentence = (s: string) => {
  const t = s.replace(/_/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** Home hero: the score, then confidence and trend as separate figures (never merged into the score), then the stage ladder. */
export function ScoreCard({ run }: { run: Run }) {
  const confidence = Math.round(Number(run.confidence) * 100);
  const improving = run.trend === "improving";
  return (
    <Card variant="dark" className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-center">
      <ScoreRing value={Number(run.overall)} stage={run.stage} provisional={run.stage_provisional} early={run.early_estimate} />
      <div className="min-w-0 space-y-4">
        <dl className="space-y-2">
          <div className="grid grid-cols-[7rem_1fr_auto] items-center gap-3 rounded-lg border border-line bg-surface-2/60 px-4 py-2.5">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.09em] text-muted">Confidence</dt>
            <dd className="font-display text-xl font-bold tabular-nums">{confidence}%</dd>
            <ProgressBar value={confidence} tone="ai" className="w-20" label="Confidence" />
          </div>
          <div className="grid grid-cols-[7rem_1fr] items-center gap-3 rounded-lg border border-line bg-surface-2/60 px-4 py-2.5">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.09em] text-muted">Trend</dt>
            <dd className={`font-display text-xl font-bold ${improving ? "text-positive" : ""}`}>
              {improving ? "▲ " : ""}
              {sentence(run.trend)}
            </dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-2">
          {!run.official && <Badge tone="demo">Demo rules</Badge>}
          {run.early_estimate && <Badge tone="demo">Early estimate</Badge>}
        </div>
        <p className="text-sm text-muted">
          Confidence is the share of the score we could measure from what you have told us. Missing information lowers confidence, it is never counted as
          zero.
        </p>
        {/* An early estimate (low confidence) must not announce a stage, so the ladder marks nothing. */}
        <StageLadder stage={run.early_estimate ? "" : run.stage} provisional={run.stage_provisional} />
        <div className="flex flex-wrap gap-2 pt-1">
          <Link href="/app/score" className={buttonClass("primary")}>
            Why this score?
          </Link>
          <Link href="/app/interview" className={buttonClass("secondary")}>
            Tell me more
          </Link>
        </div>
      </div>
    </Card>
  );
}
