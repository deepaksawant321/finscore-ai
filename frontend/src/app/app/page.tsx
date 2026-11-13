"use client";

import Link from "next/link";

import { Alert, Badge, Card } from "@/design-system/ui";
import { useAuth } from "@/features/auth/auth-context";
import { ScoreRing } from "@/features/score/score-ring";
import { useCurrentScore } from "@/features/score/hooks";

const linkBtn = "inline-flex min-h-[44px] items-center rounded-md bg-brand px-4 text-sm font-semibold text-brand-ink";

export default function Home() {
  const { user } = useAuth();
  const score = useCurrentScore();
  const s = score.data;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Welcome{user?.full_name ? `, ${user.full_name}` : ""}</h1>

      {score.isLoading && <p className="text-muted">Loading…</p>}
      {score.isError && <Alert tone="error">Could not load your score right now.</Alert>}

      {score.isSuccess && !s && (
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold">Start with one question</h2>
          <p className="text-muted">What is the one money problem you want to solve right now? Tell me in your own words — no long form.</p>
          <Link href="/app/interview" className={linkBtn}>
            Start the conversation
          </Link>
        </Card>
      )}

      {s && (
        <>
          {s.watermark && (
            <Alert tone="info">
              <strong>{s.watermark}.</strong> This number comes from engineering placeholder rules so the product can be tested. It is not your official
              FinScore.
            </Alert>
          )}
          <Card className="grid gap-6 sm:grid-cols-[14rem_1fr] sm:items-center">
            <ScoreRing value={Number(s.overall)} stage={s.stage} provisional={s.stage_provisional} early={s.early_estimate} />
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge tone={s.trend === "improving" ? "positive" : "neutral"}>Trend: {s.trend}</Badge>
                <Badge>Confidence: {Math.round(Number(s.confidence) * 100)}%</Badge>
                {!s.official && <Badge tone="demo">Demo rules</Badge>}
                {s.early_estimate && <Badge tone="demo">Early estimate</Badge>}
              </div>
              <p className="text-sm text-muted">
                Confidence is the share of the score we could measure from what you have told us. Missing information lowers confidence — it is never
                counted as zero.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href="/app/score" className={linkBtn}>
                  Why this score?
                </Link>
                <Link href="/app/interview" className="inline-flex min-h-[44px] items-center rounded-md border border-line px-4 text-sm font-semibold">
                  Tell me more
                </Link>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
