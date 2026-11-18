"use client";

import { useState } from "react";

import { Alert, Badge, Button, Card, Icon, ProgressBar, SegmentedTabs } from "@/design-system/ui";
import { api } from "@/lib/api/client";
import { unwrap, useBilling } from "@/features/workspace/api";
import type { Plan } from "@/features/workspace/api";
import { ENTERPRISE_FEATURES, PLAN_BLURB } from "@/features/workspace/catalogue";
import { planFeatures } from "@/features/workspace/logic";
import { PageHead } from "@/features/workspace/page-head";
import { useWorkspace } from "@/features/workspace/workspace-store";
import { formatInr } from "@/lib/format";
import { track } from "@/lib/analytics";

const n = (v: string | number | null | undefined): number => Number(v ?? 0);
const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { dateStyle: "medium" });

export default function BillingPage() {
  const ws = useWorkspace();
  const { org } = ws;
  const allowed = ws.can("billing.manage");
  const billing = useBilling(ws.orgId, allowed);
  const b = billing.data;
  const [annual, setAnnual] = useState<boolean | null>(null);
  const yearly = annual ?? org.billing_cycle === "yearly";
  const path = { org_id: ws.orgId };

  if (!allowed) {
    return (
      <div className="space-y-4">
        <PageHead title="Plans & billing" description="Pay for scores generated. Switch plans any time." />
        <Alert tone="info">Your role ({org.my_role}) cannot see billing. Ask an owner or admin.</Alert>
      </div>
    );
  }
  if (!b) return <p className="text-muted">Loading billing…</p>;

  const cycle = yearly ? "yearly" : "monthly";
  const price = (p: Plan) => (yearly ? p.price_per_month_yearly : p.price_per_month_monthly);
  const meters: [string, number, number | null][] = [
    ["Scores generated", org.usage.scores_used, org.usage.scores_limit],
    ["Seats", org.usage.seats_used, org.usage.seats_limit],
  ];

  const rank = (key: string) => b.plans.findIndex((x) => x.key === key);
  const needsTeam = (p: Plan) => !b.payments_enabled && rank(p.key) > rank(b.plan_key) && n(price(p)) > 0;

  async function choose(p: Plan) {
    if (p.key === "enterprise") return void ws.run(() => unwrap(api.POST("/api/v1/orgs/{org_id}/billing/contact-sales", { params: { path } })), "Thanks. Sales will contact you within one business day.");
    // No payment provider yet: a priced upgrade is arranged by our team instead of switching on paid quota for free.
    if (needsTeam(p)) {
      track("plan_upgrade_requested", { target: p.key });
      return void ws.run(
        () => unwrap(api.POST("/api/v1/orgs/{org_id}/billing/contact-sales", { params: { path }, body: { plan_key: p.key, cycle } })),
        `Thanks. Our team will contact you within one business day to set up ${p.name}.`,
      );
    }
    // The server decides whether a change applies now (upgrade) or at the end of the month (downgrade).
    await ws.run(() => unwrap(api.PUT("/api/v1/orgs/{org_id}/billing/plan", { params: { path }, body: { plan_key: p.key, cycle } })));
  }

  return (
    <div className="space-y-6">
      <PageHead
        title="Plans & billing"
        description={b.payments_enabled ? "Pay for scores generated. Upgrades start now. Downgrades start at the end of the month." : "Pay for scores generated. Our team sets up paid plans with you. Downgrades start at the end of the month."}
        actions={
          <SegmentedTabs
            ariaLabel="Billing period"
            idPrefix="per"
            value={cycle}
            onChange={(v) => setAnnual(v === "yearly")}
            items={[
              { id: "monthly", label: "Monthly" },
              { id: "yearly", label: "Yearly · lower price" },
            ]}
          />
        }
      />

      <Alert tone="info">Plans, prices and limits are placeholders until Product confirms them. Invoices are issued here, but payment collection is not connected yet.</Alert>
      {b.pending_change ? (
        <Alert tone="info">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>
              Your plan changes to <b>{b.plans.find((p) => p.key === b.pending_change!.plan_key)?.name ?? b.pending_change.plan_key}</b> on {day(b.pending_change.effective_at)}.
            </span>
            <Button size="sm" variant="secondary" onClick={() => void ws.run(() => unwrap(api.PUT("/api/v1/orgs/{org_id}/billing/plan", { params: { path }, body: { plan_key: b.plan_key, cycle: b.billing_cycle as "monthly" | "yearly" } })), "Change cancelled")}>
              Keep my current plan
            </Button>
          </div>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        {b.plans.map((p) => {
          const current = p.key === b.plan_key && cycle === b.billing_cycle;
          const sameDifferentCycle = p.key === b.plan_key && !current;
          const amount = price(p);
          const features = p.key === "enterprise" ? ENTERPRISE_FEATURES : planFeatures(p, (x) => formatInr(x));
          return (
            <Card key={p.key} className={`relative flex flex-col gap-4 ${p.key === b.plan_key ? "!border-2 !border-brand" : ""}`}>
              {p.key === b.plan_key ? <Badge tone="brand" className="absolute right-4 top-4">Current plan</Badge> : null}
              <div>
                <h2 className="font-display text-lg font-semibold">{p.name}</h2>
                <p className="text-sm text-muted">{PLAN_BLURB[p.key] ?? ""}</p>
              </div>
              <p>
                <span className="font-display text-4xl font-bold tracking-tight">{amount == null ? "Custom" : n(amount) === 0 ? "Free" : formatInr(n(amount))}</span>
                {amount != null && n(amount) > 0 ? <span className="text-sm text-muted"> / month</span> : null}
              </p>
              {amount != null && n(amount) > 0 && yearly ? <p className="-mt-2 text-xs text-muted">Billed at {formatInr(n(amount))} a month on a yearly plan</p> : null}
              <ul className="space-y-2 text-sm">
                {features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="mt-0.5 text-brand-strong">
                      <Icon name="check" size={16} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Button variant={current ? "secondary" : "primary"} disabled={current} className="mt-auto" onClick={() => void choose(p)}>
                {current ? `You are on ${p.name}` : p.key === "enterprise" ? "Contact sales" : needsTeam(p) ? `Ask our team for ${p.name}` : sameDifferentCycle ? `Switch to ${cycle} billing` : `Choose ${p.name}`}
              </Button>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold">This month&apos;s usage</h2>
            <span className="text-xs text-muted">{org.usage.period}</span>
          </div>
          {meters.map(([label, u, limit]) => (
            <div key={label} className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span>{label}</span>
                <b className="tabular-nums">
                  {u.toLocaleString("en-IN")} {limit == null ? null : <span className="font-medium text-muted">of {limit.toLocaleString("en-IN")}</span>}
                </b>
              </div>
              {limit == null ? null : <ProgressBar value={(u / limit) * 100} label={label} tone={u / limit > 0.9 ? "warn" : "brand"} />}
            </div>
          ))}
          <div className="flex items-baseline justify-between border-t border-line pt-4">
            <span>Estimated invoice this month</span>
            <b className="font-display text-xl tabular-nums">{b.estimate ? formatInr(n(b.estimate.total)) : "Custom"}</b>
          </div>
          <p className="text-xs text-muted">
            {b.estimate
              ? `${formatInr(n(b.estimate.subtotal))} plan and usage + ${formatInr(n(b.estimate.gst))} GST (${Math.round(n(b.gst_rate) * 100)}%). An estimate, not an invoice.`
              : "Enterprise pricing is agreed with our sales team."}
          </p>
        </Card>

        <Card className="space-y-1">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold">Invoices</h2>
            <Button size="sm" variant="secondary" disabled={!b.estimate} onClick={() => void ws.run(() => unwrap(api.POST("/api/v1/orgs/{org_id}/billing/invoices", { params: { path }, body: {} })), "Invoice issued for this month")}>
              Issue this month
            </Button>
          </div>
          {b.invoices.length === 0 ? <p className="text-sm text-muted">No invoices yet.</p> : null}
          {b.invoices.map((i) => (
            <div key={i.id} className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-0">
              <div>
                <p className="text-sm font-semibold">{i.period}</p>
                <p className="text-xs text-muted">
                  {i.number} · {formatInr(n(i.total))} incl. GST
                </p>
              </div>
              <Badge tone={i.status === "paid" ? "positive" : "warn"}>{i.status === "paid" ? "Paid" : "Awaiting payment"}</Badge>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
