"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Alert, Button, Card } from "@/design-system/ui";
import { NudgeCard, useNudgeReaction, useNudges } from "@/features/companion/nudges";
import { api, problemMessage } from "@/lib/api/client";

const RULE_LABEL: Record<string, string> = {
  health_alert: "Health check alerts",
  action_next: "Next best action",
  action_waiting: "Update numbers after an action",
  action_stalled: "Actions that stalled",
  goal_deadline: "Goal dates approaching",
  stale_fact: "Details that may be out of date",
  score_moved: "Score changes",
  data_gap: "Missing details",
};

export default function TodayPage() {
  const nudges = useNudges();
  const { react, error } = useNudgeReaction();
  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-xl font-bold">Today</h1>
      <p className="text-sm text-muted">
        Each message shows why it appears and offers one next step. You decide how often I speak up, and anything you dismiss stays dismissed.
      </p>
      {error && <Alert tone="error">{error}</Alert>}
      {nudges.isLoading && <p className="text-muted">Checking what matters today…</p>}
      {nudges.isError && <Alert tone="error">{(nudges.error as Error).message}</Alert>}
      {nudges.data?.length === 0 && (
        <Card>
          <p className="text-sm">Nothing needs your attention today.</p>
        </Card>
      )}
      <ul className="space-y-3">
        {nudges.data?.map((n) => (
          <li key={n.id}>
            <NudgeCard n={n} onReact={react} />
          </li>
        ))}
      </ul>
      <Prefs />
    </div>
  );
}

function Prefs() {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const prefs = useQuery({
    queryKey: ["nudge-prefs"],
    queryFn: async () => (await api.GET("/api/v1/notification-prefs")).data ?? null,
  });
  const p = prefs.data;
  if (!p) return null;

  async function save(next: { in_app_enabled: boolean; max_active: number; muted_rules: string[] }) {
    setError(null);
    setSaved(false);
    const { error: err } = await api.PUT("/api/v1/notification-prefs", { body: next });
    if (err) return setError(problemMessage(err));
    setSaved(true);
    await Promise.all([qc.invalidateQueries({ queryKey: ["nudge-prefs"] }), qc.invalidateQueries({ queryKey: ["nudges"] })]);
  }
  const muted = p.muted_rules ?? [];
  const cur = { in_app_enabled: p.in_app_enabled, max_active: p.max_active, muted_rules: muted };

  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">How often should I speak up?</h2>
      {error && <Alert tone="error">{error}</Alert>}
      {saved && <Alert tone="success">Saved.</Alert>}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={p.in_app_enabled} onChange={(e) => void save({ ...cur, in_app_enabled: e.target.checked })} />
        Show me nudges in the app
      </label>
      <div className="space-y-1">
        <label htmlFor="maxn" className="text-sm font-medium">
          Show at most
        </label>
        <select id="maxn" className="ml-2 min-h-[40px] rounded-md border border-line bg-surface px-2 text-sm" value={p.max_active} onChange={(e) => void save({ ...cur, max_active: Number(e.target.value) })}>
          {[1, 2, 3, 5, 10].map((n) => (
            <option key={n} value={n}>
              {n} at a time
            </option>
          ))}
        </select>
      </div>
      <fieldset className="space-y-1">
        <legend className="text-sm font-medium">Types of nudges</legend>
        {p.available_rules.map((r) => {
          const on = !muted.includes(r);
          return (
            <label key={r} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={on}
                onChange={(e) => void save({ ...cur, muted_rules: e.target.checked ? muted.filter((x) => x !== r) : [...muted, r] })}
              />
              {RULE_LABEL[r] ?? r}
            </label>
          );
        })}
      </fieldset>
      <Button variant="ghost" onClick={() => void qc.invalidateQueries({ queryKey: ["nudges"] })}>
        Refresh
      </Button>
    </Card>
  );
}
