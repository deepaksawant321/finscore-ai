"use client";

import Link from "next/link";

import { Badge, Card, buttonClass } from "@/design-system/ui";

import { useActions } from "./hooks";

const OPEN = new Set(["suggested", "accepted", "in_progress"]);

/** Home: the single highest-ranked open action (the server returns them ranked). Shows nothing until there is one. */
export function NextStepCard() {
  const actions = useActions();
  const next = actions.data?.find((a) => OPEN.has(a.state));
  if (!next) return null;
  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">Your next best step</h2>
        {next.watermark ? <Badge tone="demo">Demo rules</Badge> : null}
      </div>
      <div className="space-y-2 rounded-lg border border-line bg-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="font-semibold">{next.title}</h3>
          <Badge tone="positive">{next.expected_score_change} pts</Badge>
        </div>
        <p className="text-sm text-muted">{next.why}</p>
        <div className="flex flex-wrap gap-1.5">
          <Badge>Effort: {next.effort}</Badge>
          <Badge>About {next.time_to_impact_weeks} weeks to show</Badge>
        </div>
      </div>
      <Link href="/app/actions" className={buttonClass("primary")}>
        {next.cta}
      </Link>
    </Card>
  );
}
