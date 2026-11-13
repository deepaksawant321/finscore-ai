"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { Alert, Card } from "@/design-system/ui";
import { useCurrentScore } from "@/features/score/hooks";
import { api } from "@/lib/api/client";

const LABELS: Record<string, string> = {
  has_term_insurance: "term insurance status",
  has_health_insurance: "health insurance status",
  emergency_months: "savings and monthly expenses",
  debt_to_income: "loan EMIs",
  savings_rate: "income and expenses",
};

export default function ScoreWhyPage() {
  const score = useCurrentScore();
  const run = score.data;
  const explain = useQuery({
    enabled: !!run,
    queryKey: ["score", "explain", run?.id],
    queryFn: async () => {
      const { data } = await api.GET("/api/v1/score/{run_id}/explain", { params: { path: { run_id: run!.id } } });
      if (!data) throw new Error("explain failed");
      return data;
    },
  });

  if (score.isLoading) return <p className="text-muted">Loading…</p>;
  if (!run)
    return (
      <Card>
        <p>No score yet. <Link href="/app/interview" className="text-ai underline">Start the conversation</Link> first.</p>
      </Card>
    );
  const e = explain.data;
  const max = e ? Math.max(1, ...[...e.positive_drivers, ...e.negative_drivers].map((p) => Math.abs(Number(p.contribution ?? 0)))) : 1;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Why is your score {Math.round(Number(run.overall))}?</h1>
      {e?.watermark && <Alert tone="info">{e.watermark}. These factors use placeholder rules, not the official methodology.</Alert>}
      {explain.isError && <Alert tone="error">Could not load the explanation.</Alert>}
      {e && (
        <>
          <Card className="space-y-3">
            <p className="text-sm text-muted">
              Every point is traceable: the reference score of <strong className="tabular-nums">{Math.round(Number(e.reference))}</strong> plus each factor below equals your score. Bars
              show points added (right) or taken away (left).
            </p>
            <ul className="space-y-2" aria-label="Score factors">
              {[...e.positive_drivers, ...e.negative_drivers].map((p) => {
                const c = Number(p.contribution ?? 0);
                return (
                  <li key={p.id} className="grid grid-cols-[1fr_auto] items-center gap-3 sm:grid-cols-[12rem_1fr_4rem]">
                    <span className="text-sm">{p.name}</span>
                    <div className="relative hidden h-4 sm:block" aria-hidden="true">
                      <div className="absolute left-1/2 top-0 h-4 w-px bg-line" />
                      <div
                        className={c >= 0 ? "absolute left-1/2 h-4 rounded-r bg-positive" : "absolute h-4 rounded-l bg-negative"}
                        style={c >= 0 ? { width: `${(c / max) * 50}%` } : { right: "50%", width: `${(-c / max) * 50}%` }}
                      />
                    </div>
                    <span className={`text-right text-sm font-semibold tabular-nums ${c >= 0 ? "text-positive" : "text-negative"}`}>
                      {c >= 0 ? "+" : "−"}
                      {Math.abs(c).toFixed(1)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
          {e.not_scored.length > 0 && (
            <Card className="space-y-2">
              <h2 className="font-semibold">Not scored yet ({e.not_scored.length} areas)</h2>
              <p className="text-sm text-muted">
                These areas have no measure yet or need information I don&apos;t have. They lower your confidence, not your score.
                {e.missing_inputs.length > 0 && <> Telling me about your {[...new Set(e.missing_inputs.map((m) => LABELS[m] ?? m))].join(", ")} would help.</>}
              </p>
              <ul className="flex flex-wrap gap-2 text-xs">
                {e.not_scored.map((p) => (
                  <li key={p.id} className="rounded-full bg-surface-2 px-2.5 py-1">{p.name}</li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
