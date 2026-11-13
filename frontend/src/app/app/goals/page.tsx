"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { FormEvent } from "react";

import { Alert, Badge, Button, Card, Input } from "@/design-system/ui";
import { api, problemMessage } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { formatInr } from "@/lib/format";

type Goal = components["schemas"]["GoalOut"];

export default function GoalsPage() {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const goals = useQuery({
    queryKey: ["goals"],
    queryFn: async () => {
      const { data } = await api.GET("/api/v1/goals");
      if (!data) throw new Error("goals failed");
      return data;
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["goals"] });

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setError(null);
    const { response, error: err } = await api.POST("/api/v1/goals", {
      body: {
        name: String(f.get("name")),
        target_amount_today: String(f.get("amount")),
        target_date: String(f.get("date")),
        priority: String(f.get("priority")) as "essential" | "important" | "aspirational",
        current_funding: String(f.get("current") || "0"),
        monthly_funding: String(f.get("monthly") || "0"),
      },
    });
    if (!response.ok) return setError(problemMessage(err));
    form.reset();
    void refresh();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Your goals</h1>
      <p className="text-sm text-muted">
        Amounts are in today&apos;s rupees. I never create a goal for you without asking — you decide what matters.
      </p>
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Add a goal</h2>
        <form method="post" onSubmit={create} className="grid gap-4 sm:grid-cols-2">
          {error && (
            <div className="sm:col-span-2">
              <Alert tone="error">{error}</Alert>
            </div>
          )}
          <Input name="name" label="What is it for?" required maxLength={80} placeholder="e.g. House down payment" />
          <Input name="amount" label="Target amount (₹, today's value)" type="number" min="1" step="1" required inputMode="numeric" />
          <Input name="date" label="Target date" type="date" required />
          <div className="space-y-1.5">
            <label htmlFor="priority" className="text-sm font-medium">
              Priority
            </label>
            <select id="priority" name="priority" defaultValue="important" className="min-h-[44px] w-full rounded-md border border-line bg-surface px-3 text-sm">
              <option value="essential">Essential</option>
              <option value="important">Important</option>
              <option value="aspirational">Aspirational</option>
            </select>
          </div>
          <Input name="current" label="Already set aside (₹, optional)" type="number" min="0" step="1" inputMode="numeric" />
          <Input name="monthly" label="You add each month (₹, optional)" type="number" min="0" step="1" inputMode="numeric" />
          <div className="sm:col-span-2">
            <Button type="submit">Add goal</Button>
          </div>
        </form>
      </Card>

      {goals.isLoading && <p className="text-muted">Loading…</p>}
      {goals.data?.length === 0 && <Card className="text-muted">No goals yet.</Card>}
      <ul className="space-y-4">
        {goals.data?.map((g) => (
          <li key={g.id}>
            <GoalCard goal={g} onChanged={refresh} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function GoalCard({ goal, onChanged }: { goal: Goal; onChanged: () => void }) {
  const [ret, setRet] = useState("");
  const [infl, setInfl] = useState("");
  const [show, setShow] = useState(false);
  const funding = useQuery({
    enabled: show && ret !== "" && infl !== "",
    queryKey: ["goal-funding", goal.id, ret, infl, goal.monthly_funding, goal.current_funding],
    queryFn: async () => {
      const { data, error } = await api.GET("/api/v1/goals/{goal_id}/funding", {
        params: { path: { goal_id: goal.id }, query: { assumed_return_pct: ret, inflation_pct: infl } },
      });
      if (!data) throw new Error(problemMessage(error));
      return data;
    },
  });
  const archive = useMutation({
    mutationFn: () => api.PATCH("/api/v1/goals/{goal_id}", { params: { path: { goal_id: goal.id } }, body: { status: "archived" } }),
    onSuccess: onChanged,
  });
  const remove = useMutation({
    mutationFn: () => api.DELETE("/api/v1/goals/{goal_id}", { params: { path: { goal_id: goal.id } } }),
    onSuccess: onChanged,
  });
  const f = funding.data;
  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold">{goal.name}</h3>
          <p className="text-sm text-muted tabular-nums">
            {formatInr(Number(goal.target_amount_today))} in today&apos;s money · by {new Date(goal.target_date).toLocaleDateString("en-IN")}
          </p>
        </div>
        <Badge>{goal.priority}</Badge>
      </div>
      <p className="text-sm tabular-nums">
        Set aside {formatInr(Number(goal.current_funding))} · adding {formatInr(Number(goal.monthly_funding))}/month
      </p>
      <div className="rounded-md bg-surface-2 p-3">
        <p className="mb-2 text-sm font-medium">How is this going? Choose your own assumptions:</p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            Return % a year
            <input value={ret} onChange={(e) => setRet(e.target.value)} inputMode="decimal" className="ml-2 min-h-[40px] w-20 rounded-md border border-line bg-surface px-2" />
          </label>
          <label className="text-sm">
            Inflation % a year
            <input value={infl} onChange={(e) => setInfl(e.target.value)} inputMode="decimal" className="ml-2 min-h-[40px] w-20 rounded-md border border-line bg-surface px-2" />
          </label>
          <Button variant="secondary" onClick={() => setShow(true)} disabled={ret === "" || infl === ""}>
            Calculate
          </Button>
        </div>
        {funding.isError && <Alert tone="error">{(funding.error as Error).message}</Alert>}
        {f && (
          <div className="mt-3 space-y-1 text-sm tabular-nums">
            <p>
              Goal in future rupees: <strong>{formatInr(Number(f.future_target))}</strong> ({f.months_remaining} months away)
            </p>
            <p>
              On track to have: <strong>{formatInr(Number(f.projected_total))}</strong> ({Math.round(Number(f.funded_ratio) * 100)}% funded)
            </p>
            <p>
              {Number(f.shortfall) > 0 ? (
                <>
                  Shortfall <strong className="text-negative">{formatInr(Number(f.shortfall))}</strong> — adding about{" "}
                  <strong>{formatInr(Number(f.required_monthly_additional))}</strong> more each month would close it.
                </>
              ) : (
                <strong className="text-positive">Fully funded under these assumptions.</strong>
              )}
            </p>
            <details className="text-xs text-muted">
              <summary className="cursor-pointer">Assumptions</summary>
              <ul className="ml-4 list-disc">
                {f.assumptions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </details>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => archive.mutate()} loading={archive.isPending}>
          Archive
        </Button>
        <Button variant="ghost" onClick={() => confirm("Delete this goal?") && remove.mutate()} loading={remove.isPending}>
          Delete
        </Button>
      </div>
    </Card>
  );
}
