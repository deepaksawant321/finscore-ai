"use client";

import Link from "next/link";

import { Alert, Card, buttonClass } from "@/design-system/ui";
import { NextStepCard } from "@/features/actions/next-step-card";
import { useAuth } from "@/features/auth/auth-context";
import { TodayCard } from "@/features/companion/nudges";
import { MatrixScoreCard } from "@/features/matrix-score/home-card";
import { useCurrentScore } from "@/features/score/hooks";
import { ScoreCard } from "@/features/score/score-card";

export default function Home() {
  const { user } = useAuth();
  const score = useCurrentScore();
  const s = score.data;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold tracking-tight">Welcome{user?.full_name ? `, ${user.full_name}` : ""}</h1>

      {score.isLoading && <p className="text-muted">Loading…</p>}
      {score.isError && <Alert tone="error">Could not load your score right now.</Alert>}

      {score.isSuccess && !s && (
        <Card className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Start with one question</h2>
          <p className="text-muted">What is the one money problem you want to solve right now? Tell me in your own words, no long form.</p>
          <Link href="/app/interview" className={buttonClass("primary", "md", "w-fit")}>
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
          <ScoreCard run={s} />
        </>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <TodayCard />
        <NextStepCard />
      </div>

      {score.isSuccess && <MatrixScoreCard />}
    </div>
  );
}
