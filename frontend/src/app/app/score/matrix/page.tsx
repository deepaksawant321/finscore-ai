"use client";

import Link from "next/link";

import { Alert, Button, Card } from "@/design-system/ui";
import { ScoreProblem, useMatrixScore } from "@/features/matrix-score/hooks";
import { MatrixScoreView } from "@/features/matrix-score/matrix-score-view";
import { JourneyHomeCard } from "@/features/journey/home-card";

export default function MatrixScorePage() {
  const { score, calculate } = useMatrixScore();
  const problem = calculate.error instanceof ScoreProblem ? calculate.error : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-bold tracking-tight">Your FinScore, workbook model</h1>
          <p className="text-sm text-muted">
            Fifteen areas of your finances, each compared with people of your age, added up to a score out of 900. A draft built from the business
            spreadsheets, next to the main score.{" "}
            <Link href="/app/score" className="text-ai underline">
              See the main score
            </Link>
          </p>
        </div>
        <Button onClick={() => calculate.mutate()} loading={calculate.isPending}>
          {score ? "Calculate again" : "Calculate my score"}
        </Button>
      </div>

      {problem?.code === "insufficient_data" && (
        <Alert tone="info">
          I need a little more before I can score you.{" "}
          <Link href="/app/journey" className="font-semibold underline">
            Answer a few quick questions
          </Link>{" "}
          (about a minute).
        </Alert>
      )}
      {problem && problem.code !== "insufficient_data" && <Alert tone="error">{problem.detail ? `${problem.message} ${problem.detail}` : problem.message}</Alert>}
      {calculate.isError && !problem && <Alert tone="error">Could not calculate your score. Please try again.</Alert>}

      {!score && !calculate.isPending && !problem && (
        <Card className="space-y-2">
          <p>
            Press <strong>Calculate my score</strong> to see it. I only use what you have told me, and anything I don&apos;t know is left out rather than
            guessed. New here?{" "}
            <Link href="/app/journey" className="font-semibold text-ai underline">
              Get your score in about a minute
            </Link>
            .
          </p>
          <p className="text-sm text-muted">Each calculation is recorded in your audit log so it can be reproduced later.</p>
        </Card>
      )}

      {score && <JourneyHomeCard />}
      {score && <MatrixScoreView score={score} />}
    </div>
  );
}
