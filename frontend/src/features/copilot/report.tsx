"use client";

import { useState } from "react";

import { Alert, Badge, Button } from "@/design-system/ui";
import { api, problemMessage } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

export type CopilotReport = components["schemas"]["CopilotReportOut"];

const TONE: Record<string, "neutral" | "demo" | "positive"> = { ok: "positive", info: "neutral", warning: "demo", blocker: "demo" };
const WORD: Record<string, string> = { ok: "Looks fine", info: "Note", warning: "Worth knowing", blocker: "Stop and check" };

/** Read-only pre-action check: the Copilot never executes anything, it only reports. A hand-off finding offers to
 * ask a person; it never files the request itself. */
export function CopilotPanel({ report }: { report: CopilotReport }) {
  const [asked, setAsked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handOff = report.findings.find((f) => f.hand_off);

  async function askPerson() {
    setError(null);
    const { response, error: err } = await api.POST("/api/v1/escalations", { body: { reason: "other", note: handOff?.message ?? null, conversation_id: null } });
    if (!response.ok) return setError(problemMessage(err));
    setAsked(true);
  }

  return (
    <div className="space-y-2 rounded-md border border-line p-3 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Before you decide</p>
      <ul className="space-y-2">
        {report.findings.map((f) => (
          <li key={f.code} className="flex items-start gap-2">
            <Badge tone={TONE[f.level] ?? "neutral"}>{WORD[f.level] ?? f.level}</Badge>
            <span>{f.message}</span>
          </li>
        ))}
        {report.findings.length === 0 && <li className="text-muted">Nothing stands out.</li>}
      </ul>
      {handOff && !asked && (
        <Button variant="secondary" onClick={() => void askPerson()}>
          Ask a person to review this
        </Button>
      )}
      {asked && <Alert tone="success">A person on our team has been asked to follow up. You can see the request in Settings.</Alert>}
      {error && <Alert tone="error">{error}</Alert>}
    </div>
  );
}
