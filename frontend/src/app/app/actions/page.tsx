"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Alert, Badge, Button, Card } from "@/design-system/ui";
import { api, problemMessage } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

type Action = components["schemas"]["ActionOut"];
type Verb = "accept" | "skip" | "snooze" | "start" | "complete" | "reopen";

const LABEL: Record<Verb, string> = { accept: "Accept", skip: "Skip", snooze: "Remind me in a week", start: "I've started", complete: "I've done it", reopen: "Reopen" };
const STATE_TEXT: Record<string, string> = {
  suggested: "Suggested",
  snoozed: "Snoozed",
  accepted: "Accepted",
  in_progress: "In progress",
  completed: "Done, waiting for your numbers to show it",
  verified: "Verified",
  skipped: "Skipped",
};
const FACTORS: [keyof NonNullable<Action["priority"]>, string][] = [
  ["impact", "Score impact"],
  ["financial_impact", "Money involved"],
  ["urgency", "Urgency"],
  ["ease", "Ease"],
  ["confidence", "Data confidence"],
  ["goal_alignment", "Supports your goals"],
];

export default function ActionsPage() {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const actions = useQuery({
    queryKey: ["actions"],
    queryFn: async () => {
      const { data, error: err } = await api.POST("/api/v1/actions/refresh");
      if (!data) throw new Error(problemMessage(err));
      return data;
    },
    retry: false,
  });
  const timeline = useQuery({
    queryKey: ["timeline", actions.dataUpdatedAt],
    enabled: !actions.isLoading, // the refresh may verify actions, so read the timeline after it
    queryFn: async () => (await api.GET("/api/v1/timeline", { params: { query: {} } })).data ?? [],
  });

  async function move(a: Action, verb: Verb) {
    setError(null);
    const { error: err } = await api.POST("/api/v1/actions/{action_id}/{verb}", {
      params: { path: { action_id: a.id, verb } },
      body: verb === "snooze" ? { days: 7 } : null,
    });
    if (err) return setError(problemMessage(err));
    await Promise.all([qc.invalidateQueries({ queryKey: ["actions"] }), qc.invalidateQueries({ queryKey: ["timeline"] }), qc.invalidateQueries({ queryKey: ["score"] })]);
  }

  const demo = actions.data?.some((a) => a.watermark);
  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-xl font-bold">Your next actions</h1>
      {demo && <Alert>This is a demo action list with demo scoring rules, not an approved plan. The score change shown is what the scoring engine computes for you.</Alert>}
      {error && <Alert tone="error">{error}</Alert>}
      {actions.isLoading && <p className="text-muted">Working out your best next steps…</p>}
      {actions.isError && <Alert tone="info">{(actions.error as Error).message}</Alert>}
      {actions.data?.length === 0 && (
        <Card>
          <p className="text-sm">
            I don&apos;t see an action that would raise your score right now. Tell me more about your finances in <a className="underline" href="/app/interview">the interview</a> to
            reveal more.
          </p>
        </Card>
      )}
      <ul className="space-y-3">
        {actions.data?.map((a) => (
          <li key={a.id}>
            <Card className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold">{a.title}</h2>
                <Badge tone={a.verified ? "positive" : "neutral"}>{STATE_TEXT[a.state] ?? a.state}</Badge>
                {a.watermark && <Badge tone="demo">Demo</Badge>}
                <span className="ml-auto text-sm font-semibold tabular-nums">
                  {Number(a.expected_score_change) > 0 ? "+" : ""}
                  {Math.round(Number(a.expected_score_change))} points
                </span>
              </div>
              <p className="text-sm">{a.cta}</p>
              <p className="text-xs text-muted">
                {a.why} Effort: {a.effort}. Typical time to show up: about {a.time_to_impact_weeks} weeks.
              </p>
              {a.priority && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted">Why this ranks here ({a.priority.total} of 100)</summary>
                  <ul className="mt-1 grid grid-cols-2 gap-x-4 tabular-nums">
                    {FACTORS.map(([k, label]) => (
                      <li key={k}>
                        {label}: {a.priority?.[k]}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {a.allowed.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {(a.allowed as Verb[]).map((v) => (
                    <Button key={v} variant={v === "accept" || v === "complete" ? "primary" : "secondary"} onClick={() => void move(a, v)}>
                      {LABEL[v]}
                    </Button>
                  ))}
                </div>
              )}
            </Card>
          </li>
        ))}
      </ul>

      <Card className="space-y-2">
        <h2 className="font-semibold">Timeline</h2>
        {timeline.data?.length === 0 && <p className="text-sm text-muted">Nothing yet.</p>}
        <ol className="space-y-1 text-sm">
          {timeline.data?.map((t, i) => (
            <li key={`${t.at}-${i}`}>
              <span className="text-xs text-muted">{new Date(t.at).toLocaleString()}</span> · {t.title}
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
