"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { FormEvent } from "react";

import { Alert, Badge, Button, Card } from "@/design-system/ui";
import { api, problemMessage } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { formatInr } from "@/lib/format";
import { track } from "@/lib/analytics";

// Display only: amounts arrive from the backend already calculated, as decimal strings.
const inr = (v: string | number) => formatInr(Number(v));

type Sim = components["schemas"]["SimulationOut"];
type Tab = "invest" | "score" | "goal";
type R = Record<string, any>;

const input = "min-h-[44px] w-full rounded-md border border-line bg-surface px-3 text-sm";

function Field({ id, label, hint, ...rest }: { id: string; label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input id={id} name={id} className={input} {...rest} />
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export default function SimulatePage() {
  const [tab, setTab] = useState<Tab>("invest");
  const [sim, setSim] = useState<Sim | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const goals = useQuery({
    queryKey: ["goals"],
    queryFn: async () => (await api.GET("/api/v1/goals", { params: { query: {} } })).data ?? [],
  });

  async function run(body: components["schemas"]["Invest"] | components["schemas"]["ScoreWhatIf"] | components["schemas"]["GoalWhatIf"]) {
    setBusy(true);
    setError(null);
    track("simulation_run", { kind: body.kind });
    const { data, error: err } = await api.POST("/api/v1/simulations", { body });
    setBusy(false);
    if (!data) return setError(problemMessage(err));
    setSim(data);
  }

  function get(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    return Object.assign((k: string) => String(d.get(k) ?? ""), { entries: () => [...d.entries()].map(([k, x]) => [k, String(x)] as const) });
  }

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="font-display text-3xl font-bold tracking-tight">What-if simulator</h1>
      <Alert>
        Simulations use only what you type here. Nothing is saved to your profile, goals or score history. Returns and inflation are your own
        assumptions, not predictions.
      </Alert>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Scenario type">
        {(
          [
            ["invest", "Invest monthly"],
            // "Change my numbers" is hidden: it shows a 20-pillar score, a different number from the FinScore (audit UX-01)
            ["goal", "Fund a goal differently"],
          ] as const
        ).map(([k, label]) => (
          <Button
            key={k}
            variant={tab === k ? "primary" : "secondary"}
            role="tab"
            aria-selected={tab === k}
            onClick={() => {
              setTab(k);
              setSim(null);
              setError(null);
            }}
          >
            {label}
          </Button>
        ))}
      </div>

      <Card>
        {tab === "invest" && (
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              const v = get(e);
              void run({
                kind: "invest",
                monthly_amount: v("monthly_amount"),
                lumpsum: v("lumpsum") || "0",
                years: Number(v("years")),
                return_pct: v("return_pct"),
                inflation_pct: v("inflation_pct") || null,
              });
            }}
          >
            <Field id="monthly_amount" label="Invest per month (₹)" inputMode="decimal" required />
            <Field id="lumpsum" label="Starting amount (₹, optional)" inputMode="decimal" />
            <Field id="years" label="Years" type="number" min={1} max={60} required />
            <Field id="return_pct" label="Return you assume (% a year)" inputMode="decimal" required hint="Your assumption. I don't suggest one." />
            <Field id="inflation_pct" label="Inflation you assume (% a year, optional)" inputMode="decimal" hint="Adds a value in today's money." />
            <div className="flex items-end">
              <Button type="submit" loading={busy}>
                Run simulation
              </Button>
            </div>
          </form>
        )}
        {tab === "score" && (
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              const v = get(e);
              const overrides = Object.fromEntries(v.entries().filter(([, x]) => x.trim() !== ""));
              if (Object.keys(overrides).length === 0) return setError("Change at least one number.");
              void run({ kind: "score_what_if", overrides });
            }}
          >
            <Field id="monthly_expenses" label="Monthly expenses (₹)" inputMode="decimal" />
            <Field id="annual_income" label="Household annual income (₹)" inputMode="decimal" />
            <Field id="liquid_assets" label="Savings you can reach quickly (₹)" inputMode="decimal" />
            <Field id="monthly_emi_total" label="Total monthly EMIs (₹)" inputMode="decimal" />
            <div className="flex items-end sm:col-span-2">
              <Button type="submit" loading={busy}>
                Compare with my current score
              </Button>
            </div>
          </form>
        )}
        {tab === "goal" &&
          (goals.data && goals.data.length > 0 ? (
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={(e) => {
                const v = get(e);
                void run({ kind: "goal_what_if", goal_id: v("goal_id"), new_monthly_funding: v("new_monthly_funding"), return_pct: v("return_pct"), inflation_pct: v("inflation_pct") });
              }}
            >
              <div className="space-y-1 sm:col-span-2">
                <label htmlFor="goal_id" className="text-sm font-medium">
                  Goal
                </label>
                <select id="goal_id" name="goal_id" className={input} required>
                  {goals.data.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
              <Field id="new_monthly_funding" label="New monthly amount (₹)" inputMode="decimal" required />
              <Field id="return_pct" label="Return you assume (% a year)" inputMode="decimal" required />
              <Field id="inflation_pct" label="Inflation you assume (% a year)" inputMode="decimal" required />
              <div className="flex items-end">
                <Button type="submit" loading={busy}>
                  Compare
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-muted">Add a goal on the Goals page first.</p>
          ))}
      </Card>

      {error && <Alert tone="error">{error}</Alert>}
      {sim && <Result sim={sim} />}
    </div>
  );
}

function Result({ sim }: { sim: Sim }) {
  const r = sim.result as R;
  return (
    <Card className="space-y-3" aria-live="polite">
      <div className="flex items-center gap-2">
        <h2 className="font-semibold">Result</h2>
        {sim.watermark && <Badge tone="demo">Demo rules</Badge>}
      </div>
      {sim.kind === "invest" && (
        <>
          <p className="text-2xl font-bold tabular-nums">{inr(r.final_value)}</p>
          <p className="text-sm text-muted">
            You put in {inr(r.total_contributed)}; growth about {inr(r.gain)}.
            {r.real_value && <> In today&apos;s money roughly {inr(r.real_value)}.</>}
          </p>
          <table className="w-full text-sm">
            <caption className="sr-only">Balance by year</caption>
            <thead>
              <tr className="text-left text-muted">
                <th>Year</th>
                <th className="text-right">Put in</th>
                <th className="text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {(r.schedule as R[]).map((p) => (
                <tr key={p.year} className="border-t border-line tabular-nums">
                  <td>{p.year}</td>
                  <td className="text-right">{inr(p.contributed)}</td>
                  <td className="text-right">{inr(p.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {sim.kind === "score_what_if" && (
        <>
          <p className="text-2xl font-bold tabular-nums">
            {Math.round(Number(r.baseline.overall))} → {Math.round(Number(r.scenario.overall))}{" "}
            <span className="text-base font-normal text-muted">
              ({Number(r.delta) > 0 ? "+" : ""}
              {Math.round(Number(r.delta))} points)
            </span>
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {(r.pillar_changes as R[]).map((c) => (
              <li key={c.id}>
                {c.name}: {c.score_before === null ? "now counted" : `${Math.round(Number(c.points_change))} points`}
              </li>
            ))}
          </ul>
        </>
      )}
      {sim.kind === "goal_what_if" && (
        <>
          <p className="text-sm">
            {r.goal}: {r.months_remaining} months left. Funding {inr(r.current_monthly)} → {inr(r.new_monthly)} a month.
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {(["before", "after"] as const).map((k) => (
              <div key={k} className="rounded-md border border-line p-3">
                <p className="font-medium capitalize">{k}</p>
                <p className="tabular-nums">Projected {inr(r[k].projected_total)}</p>
                <p className="tabular-nums">Target {inr(r[k].future_target)}</p>
                <p className="tabular-nums">{Number(r[k].shortfall) > 0 ? `Short by ${inr(r[k].shortfall)}` : `Ahead by ${inr(String(-Number(r[k].shortfall)))}`}</p>
              </div>
            ))}
          </div>
        </>
      )}
      <ul className="list-disc space-y-1 pl-5 text-xs text-muted">
        {(r.assumptions as string[]).map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>
    </Card>
  );
}
