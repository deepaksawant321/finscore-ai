import Link from "next/link";

import { Alert, Badge, Card, buttonClass } from "@/design-system/ui";
import { ScoreRing } from "@/features/score/score-ring";

import { biggestGaps, confidencePct, fieldLabel, groupFactors, orderedMissing, pointsShare, visibleAssumptions } from "./logic";
import type { MatrixFactor, MatrixScore } from "./logic";

const linkBtn = buttonClass("primary");

function FactorRow({ f }: { f: MatrixFactor }) {
  if (f.status !== "scored") {
    return (
      <li className="rounded-md bg-surface-2 px-3 py-2 text-sm">
        <span className="font-medium">{f.name}</span>
        <span className="text-muted">
          {" "}
          {f.status === "missing"
            ? `— not scored yet: I still need ${f.missing_inputs.map(fieldLabel).join(", ")}.`
            : "— does not apply to you, so it is left out."}
        </span>
      </li>
    );
  }
  const share = pointsShare(f);
  return (
    <li className="space-y-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{f.name}</span>
        <span className="text-sm tabular-nums text-muted">
          {f.points} of {f.max_points} points · {f.factor_score}/10
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`${f.name}: ${f.points} of ${f.max_points} points`}
        aria-valuemin={0}
        aria-valuemax={Number(f.max_points)}
        aria-valuenow={Number(f.points)}
        className="h-2.5 w-full rounded-full bg-surface-2"
      >
        <div className="h-2.5 rounded-full bg-brand" style={{ width: `${share * 100}%` }} />
      </div>
      <details className="text-xs text-muted">
        <summary className="cursor-pointer">How this was worked out</summary>
        <p className="mt-1">{f.reason}</p>
      </details>
    </li>
  );
}

/** The workbook-based FinScore result. Display only: every number comes from the backend engine. */
export function MatrixScoreView({ score }: { score: MatrixScore }) {
  const { scored } = groupFactors(score.factors);
  const gaps = biggestGaps(score.factors);
  const total = score.factors.length;
  const pct = confidencePct(score);
  const assumptions = visibleAssumptions(score);

  return (
    <div className="space-y-6">
      {score.watermark && (
        <Alert tone="info">
          <strong>{score.watermark}.</strong> These rules were taken from the business spreadsheets and have not been approved yet, so treat this as a
          draft, not your official FinScore.
        </Alert>
      )}

      <Card className="grid gap-6 sm:grid-cols-[14rem_1fr] sm:items-center">
        <ScoreRing value={Number(score.overall)} stage="" provisional={false} early={score.early_estimate} min={0} caption="Draft score" />
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge>Confidence: {pct}%</Badge>
            <Badge>
              {scored.length} of {total} areas measured
            </Badge>
            {!score.official && <Badge tone="demo">Draft rules</Badge>}
            {score.early_estimate && <Badge tone="demo">Early estimate</Badge>}
          </div>
          {score.early_estimate ? (
            <p className="text-sm">
              I could only measure {scored.length} of {total} areas so far, so this is an early estimate and I won&apos;t draw a conclusion from it yet.
              Tell me the missing details below for a fuller picture.
            </p>
          ) : (
            score.message && <p className="text-base font-semibold">{score.message}</p>
          )}
          <p className="text-sm text-muted">
            Confidence is the share of the score I could measure from what you told me. Missing information lowers confidence — it is never counted as zero.
            {score.confidence !== "1.0000" && " The score is scaled over the areas I could measure."}
          </p>
        </div>
      </Card>

      {gaps.length > 0 && (
        <Card className="space-y-3">
          <h2 className="font-semibold">Where there is most room to improve</h2>
          <ul className="space-y-2" aria-label="Largest gaps">
            {gaps.map((f) => (
              <li key={f.id} className="text-sm">
                <span className="font-medium">{f.name}</span>
                <span className="text-muted">
                  {" "}
                  — {f.points} of {f.max_points} points ({f.band}).
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">Ranked by points still available. This shows where the score has headroom; it is not advice on what to buy or do.</p>
        </Card>
      )}

      <Card className="space-y-4">
        <h2 className="font-semibold">All {total} areas</h2>
        <ul className="space-y-4" aria-label="Score factors">
          {score.factors.map((f) => (
            <FactorRow key={f.id} f={f} />
          ))}
        </ul>
      </Card>

      {score.missing_inputs.length > 0 && (
        <Card className="space-y-3">
          <h2 className="font-semibold">Add these to measure more of your score</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm" aria-label="Missing details">
            {orderedMissing(score.missing_inputs).map((k) => (
              <li key={k}>{fieldLabel(k)}</li>
            ))}
          </ul>
          <Link href="/app/interview" className={linkBtn}>
            Tell me in conversation
          </Link>
        </Card>
      )}

      {assumptions.length > 0 && (
        <Card className="space-y-2">
          <h2 className="font-semibold">Assumptions I made</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm" aria-label="Assumptions">
            {assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
          <p className="text-xs text-muted">If any of these is wrong, correct it under &quot;What I know about you&quot; and calculate again.</p>
        </Card>
      )}

      <p className="text-xs text-muted">
        Rule set: {score.rule_set} · version {score.rule_version} · engine {score.engine_version} · calculated{" "}
        {new Date(score.computed_at).toLocaleString("en-IN")} · fingerprint {score.input_digest.slice(0, 8)}. Same facts and same rules always give the same
        number.
      </p>
    </div>
  );
}
