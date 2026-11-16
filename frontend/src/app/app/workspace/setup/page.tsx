"use client";

import Link from "next/link";

import { Alert, Badge, Button, Card, Icon, ProgressBar, SegmentedTabs, Stat, Switch, buttonClass } from "@/design-system/ui";
import { MODULES } from "@/features/workspace/catalogue";
import { PageHead } from "@/features/workspace/page-head";
import { useWorkspace } from "@/features/workspace/workspace-store";

export default function SetupPage() {
  const ws = useWorkspace();
  const { org } = ws;
  const done = ws.items.filter((i) => i.done).length;
  const nextIndex = ws.items.findIndex((i) => !i.done);
  const canEdit = ws.can("branding.edit");
  const canSwitch = ws.can("keys.manage");
  const planAllowsLive = org.entitlements.live_allowed;
  const limit = org.usage.scores_limit;

  return (
    <div className="space-y-6">
      <PageHead
        title="Go live in 15 minutes"
        description="Four steps from a sandbox to a branded FinScore inside your own product. Nothing to host and no code to maintain."
        actions={
          <>
            <SegmentedTabs
              ariaLabel="Environment"
              idPrefix="env"
              value={org.environment as "sandbox" | "live"}
              onChange={(e) => void ws.setEnvironment(e)}
              items={[
                { id: "sandbox", label: "Sandbox" },
                { id: "live", label: "Live" },
              ]}
            />
            <Button
              disabled={!ws.ready || !planAllowsLive || !canSwitch || org.environment === "live"}
              onClick={() => void ws.setEnvironment("live")}
              title={!planAllowsLive ? `The ${org.entitlements.plan_name} plan is sandbox only` : ws.ready ? undefined : "Complete the checklist first"}
            >
              <Icon name="rocket" size={18} /> Go live
            </Button>
          </>
        }
      />

      {!planAllowsLive ? (
        <Alert tone="info">
          The {org.entitlements.plan_name} plan is sandbox only.{" "}
          <Link href="/app/workspace/billing" className="font-semibold underline">
            Upgrade to go live
          </Link>
          .
        </Alert>
      ) : null}
      {!canEdit ? <Alert tone="info">You can view this workspace. Your role ({org.my_role}) cannot change its setup.</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold">Setup checklist</h2>
            <Badge tone="brand">
              {done} of {ws.items.length} done
            </Badge>
          </div>
          <ProgressBar value={(done / ws.items.length) * 100} label="Setup progress" />
          <ol className="space-y-3">
            {ws.items.map((c, i) => (
              <li key={c.id} className={`flex items-start gap-3.5 rounded-lg border bg-surface p-3.5 ${!c.done && i === nextIndex ? "border-brand ring-4 ring-brand/15" : "border-line"}`}>
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${c.done ? "bg-brand text-brand-ink" : "bg-surface-2 text-muted"}`}>
                  {c.done ? <Icon name="check" size={14} /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className={c.done ? "font-semibold text-muted line-through" : "font-semibold"}>{c.title}</h3>
                  <p className="text-sm text-muted">{c.detail}</p>
                </div>
                {c.done ? (
                  <Badge tone="positive">Done</Badge>
                ) : c.cta ? (
                  <Link href={c.cta.href} className={buttonClass(i === nextIndex ? "primary" : "secondary", "sm")}>
                    {c.cta.label}
                  </Link>
                ) : null}
              </li>
            ))}
          </ol>
        </Card>

        <Card>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold">Plug-and-play modules</h2>
            <Badge>
              {org.modules.length} of {org.entitlements.max_modules ?? MODULES.length} on
            </Badge>
          </div>
          <ul>
            {MODULES.map((m) => {
              const on = org.modules.includes(m.id);
              return (
                <li key={m.id} className="flex items-center justify-between gap-4 border-b border-line py-3 last:border-0">
                  <div>
                    <p className="text-sm font-semibold">{m.name}</p>
                    <p className="text-xs text-muted">{m.description}</p>
                  </div>
                  <Switch
                    checked={on}
                    disabled={!canEdit || (on && org.modules.length === 1)}
                    onChange={(next) => void ws.setModules(next ? [...org.modules, m.id] : org.modules.filter((x) => x !== m.id))}
                    label={m.name}
                  />
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-muted">
            The {org.entitlements.plan_name} plan includes {org.entitlements.max_modules ?? "all"} module{org.entitlements.max_modules === 1 ? "" : "s"}. Keep at least one on.
          </p>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Scores this month" value={org.usage.scores_used.toLocaleString("en-IN")} hint={limit == null ? `${org.entitlements.plan_name} plan` : `of ${limit.toLocaleString("en-IN")} on ${org.entitlements.plan_name}`} />
        <Stat label="Sandbox calls" value={org.usage.sandbox_calls.toLocaleString("en-IN")} hint="Free, not billed" />
        <Stat label="Live calls" value={org.usage.live_calls.toLocaleString("en-IN")} hint={org.environment === "live" ? "Live now" : "Live keys are off"} />
        <Stat label="Seats" value={`${org.usage.seats_used}${org.usage.seats_limit == null ? "" : ` of ${org.usage.seats_limit}`}`} hint="People on the team" />
      </div>
    </div>
  );
}
