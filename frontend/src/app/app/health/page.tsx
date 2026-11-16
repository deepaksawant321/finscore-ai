"use client";

import { useQuery } from "@tanstack/react-query";

import { Alert, Badge, Card } from "@/design-system/ui";
import { api, problemMessage } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

type Vital = components["schemas"]["VitalOut"];

// Status is never conveyed by colour alone: every light also has a word and a shape.
const LIGHT: Record<string, { word: string; dot: string; shape: string }> = {
  green: { word: "Healthy", dot: "bg-positive", shape: "●" },
  amber: { word: "Watch", dot: "bg-warn", shape: "▲" },
  red: { word: "Needs attention", dot: "bg-negative", shape: "■" },
  unknown: { word: "Not measured yet", dot: "bg-line", shape: "○" },
};
const QUALITY: Record<string, string> = { good: "Good", fair: "Fair", poor: "Poor" };

function Light({ status }: { status: string }) {
  const l = LIGHT[status] ?? LIGHT.unknown!;
  return (
    <span className="inline-flex items-center gap-2 text-sm font-semibold">
      <span className={`inline-block h-3 w-3 rounded-full ${l.dot}`} aria-hidden="true" />
      <span aria-hidden="true">{l.shape}</span>
      {l.word}
    </span>
  );
}

export default function HealthPage() {
  const q = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const { data, error } = await api.POST("/api/v1/health-monitor/check");
      if (!data) throw new Error(problemMessage(error));
      return data;
    },
    retry: false,
  });
  const h = q.data;
  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="font-display text-3xl font-bold tracking-tight">Financial health check</h1>
      {q.isLoading && <p className="text-muted">Checking your vitals…</p>}
      {q.isError && <Alert tone="info">{(q.error as Error).message}</Alert>}
      {h?.watermark && <Alert>{h.watermark}. The green, amber and red cut-offs are placeholders until Product approves them.</Alert>}
      {h && (
        <>
          <Card className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Your financial health</p>
              <Light status={h.overall} />
              <p className="mt-1 text-xs text-muted">The weakest vital I can measure.</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">How reliable this check is</p>
              <p className="text-sm font-semibold">{QUALITY[h.data_quality] ?? h.data_quality}</p>
              <p className="mt-1 text-xs text-muted">Based on how many vitals are measured and how recent your numbers are. This is separate from your health above.</p>
            </div>
          </Card>

          {h.events.length > 0 && (
            <Card className="space-y-2">
              <h2 className="font-semibold">What changed</h2>
              <ul className="space-y-2 text-sm">
                {h.events.map((e) => (
                  <li key={`${e.vital}-${e.kind}`} className="flex flex-wrap items-center gap-2">
                    <Badge tone={e.category === "health" ? (e.kind === "health_worse" ? "demo" : "positive") : "neutral"}>
                      {e.category === "health" ? "Your health" : "Data quality"}
                    </Badge>
                    {e.message}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <ul className="space-y-3">
            {h.vitals.map((v: Vital) => (
              <li key={v.key}>
                <Card className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{v.label}</h2>
                    <Light status={v.status} />
                    {v.stale && <Badge tone="demo">May be out of date</Badge>}
                    <span className="ml-auto text-lg font-semibold tabular-nums">{v.value_display ?? "—"}</span>
                  </div>
                  <p className="text-xs text-muted">{v.rule_text}</p>
                  {!v.known && (
                    <p className="text-xs">
                      I can&apos;t measure this yet. <a className="underline" href="/app/interview">Tell me more</a>
                    </p>
                  )}
                  {v.stale && v.fact_age_days !== null && (
                    <p className="text-xs">
                      The numbers behind it are {v.fact_age_days} days old. <a className="underline" href="/app/memory">Review them</a>
                    </p>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
