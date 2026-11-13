"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { Alert, Badge, Button, Card } from "@/design-system/ui";
import { api, problemMessage } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

export type Nudge = components["schemas"]["NudgeOut"];
type Reaction = components["schemas"]["ReactIn"]["action"];

/** Refreshing evaluates the rules on the server (idempotent), so every visit shows today's state. */
export function useNudges() {
  return useQuery({
    queryKey: ["nudges"],
    queryFn: async () => {
      const { data, error } = await api.POST("/api/v1/nudges/refresh");
      if (!data) throw new Error(problemMessage(error));
      return data;
    },
    retry: false,
  });
}

export function useNudgeReaction() {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  async function react(n: Nudge, action: Reaction, days?: number) {
    setError(null);
    const { error: err } = await api.PATCH("/api/v1/nudges/{nudge_id}", {
      params: { path: { nudge_id: n.id } },
      body: { action, days: days ?? null },
    });
    if (err) return setError(problemMessage(err));
    await qc.invalidateQueries({ queryKey: ["nudges"] });
  }
  return { react, error };
}

const TONE: Record<string, "neutral" | "demo" | "positive"> = { critical: "demo", high: "demo", medium: "neutral", low: "neutral", habit: "positive" };

export function NudgeCard({ n, onReact }: { n: Nudge; onReact: (n: Nudge, a: Reaction, days?: number) => void }) {
  return (
    <Card className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold">{n.title}</h3>
        <Badge tone={TONE[n.priority] ?? "neutral"}>{n.priority}</Badge>
      </div>
      <p className="text-sm">{n.body}</p>
      <div className="flex flex-wrap gap-2">
        <Link
          href={n.cta_path}
          onClick={() => onReact(n, "seen")}
          className="inline-flex min-h-[44px] items-center rounded-md bg-brand px-4 text-sm font-semibold text-brand-ink"
        >
          {n.cta_label}
        </Link>
        <Button variant="secondary" onClick={() => onReact(n, "snooze", 3)}>
          Not now (3 days)
        </Button>
        <Button variant="ghost" onClick={() => onReact(n, "dismiss")}>
          Don&apos;t show this again
        </Button>
      </div>
    </Card>
  );
}

/** Home card: the single most important nudge ("one message, one action"). */
export function TodayCard() {
  const q = useNudges();
  const { react, error } = useNudgeReaction();
  const top = q.data?.[0];
  if (!top) return null;
  return (
    <section aria-label="Today" className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Today</h2>
      {error && <Alert tone="error">{error}</Alert>}
      <NudgeCard n={top} onReact={react} />
      {(q.data?.length ?? 0) > 1 && (
        <Link href="/app/today" className="text-sm underline">
          See {q.data!.length - 1} more
        </Link>
      )}
    </section>
  );
}
