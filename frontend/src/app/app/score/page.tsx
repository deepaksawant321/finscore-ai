"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Alert, Button, Card } from "@/design-system/ui";
import { JourneyHomeCard } from "@/features/journey/home-card";
import { ScoreProblem, useMatrixScore } from "@/features/matrix-score/hooks";
import { MatrixScoreView } from "@/features/matrix-score/matrix-score-view";
import { track } from "@/lib/analytics";

/** The FinScore page: fifteen areas, each compared with people of your age, added up to a score out of 900. */
export default function ScorePage() {
  const { score, loading, loadError, calculate } = useMatrixScore();
  useEffect(() => track("score_view"), []);
  const problem = calculate.error instanceof ScoreProblem ? calculate.error : loadError instanceof ScoreProblem ? loadError : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-bold tracking-tight">Your FinScore</h1>
          <p className="text-sm text-muted">Fifteen areas of your finances, each compared with people of your age, added up to a score out of 900.</p>
        </div>
        {score && (
          <Button variant="secondary" onClick={() => calculate.mutate()} loading={calculate.isPending}>
            Calculate again
          </Button>
        )}
      </div>

      {loading && <p className="text-muted">Loading your score…</p>}
      {problem && <Alert tone="error">{problem.detail ? `${problem.message} ${problem.detail}` : problem.message}</Alert>}
      {calculate.isError && !problem && <Alert tone="error">Could not calculate your score. Please try again.</Alert>}

      {!loading && !score && !problem && (
        <Card className="space-y-3">
          <p>
            You don&apos;t have a score yet. Answer a few quick questions and it appears. I only use what you tell me, and anything I don&apos;t know is
            left out rather than guessed.
          </p>
          <Link href="/app/journey" className="font-semibold text-ai underline">
            Get my score in about a minute
          </Link>
        </Card>
      )}

      {score && <JourneyHomeCard />}
      {score && <MatrixScoreView score={score} />}
    </div>
  );
}
