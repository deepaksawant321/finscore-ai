"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Alert, Badge, Button, Card } from "@/design-system/ui";
import { useAuth } from "@/features/auth/auth-context";
import { api, problemMessage } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

type Esc = components["schemas"]["StaffEscalationOut"];
const STAFF = ["support", "compliance", "admin"];
const FILTERS = [
  ["", "All"],
  ["open", "Open"],
  ["assigned", "Assigned"],
  ["resolved", "Resolved"],
] as const;

export default function StaffInbox() {
  const { user } = useAuth();
  const isStaff = (user?.roles ?? []).some((r) => STAFF.includes(r));
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>("open");
  const [error, setError] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["staff-escalations", status],
    enabled: isStaff,
    queryFn: async () => {
      const { data, error: err } = await api.GET("/api/v1/admin/escalations", { params: { query: status ? { status } : {} } });
      if (!data) throw new Error(problemMessage(err));
      return data;
    },
  });

  async function update(e: Esc, body: components["schemas"]["StaffEscalationPatch"]) {
    setError(null);
    const { error: err } = await api.PATCH("/api/v1/admin/escalations/{esc_id}", { params: { path: { esc_id: e.id } }, body });
    if (err) return setError(problemMessage(err));
    await qc.invalidateQueries({ queryKey: ["staff-escalations"] });
  }

  if (!isStaff) return <Alert tone="info">This page is for support and compliance staff.</Alert>;

  return (
    <div className="max-w-4xl space-y-4">
      <h1 className="text-xl font-bold">Support requests</h1>
      <p className="text-sm text-muted">Opening this list is recorded in the audit log for each request you can see.</p>
      <div className="flex gap-2" role="group" aria-label="Filter by status">
        {FILTERS.map(([v, label]) => (
          <Button key={label} variant={status === v ? "primary" : "secondary"} onClick={() => setStatus(v)}>
            {label}
          </Button>
        ))}
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      {q.isError && <Alert tone="error">{(q.error as Error).message}</Alert>}
      {q.isLoading && <p className="text-muted">Loading…</p>}
      {q.data?.length === 0 && <p className="text-muted">Nothing here.</p>}
      <ul className="space-y-3">
        {q.data?.map((e) => (
          <EscCard key={e.id} e={e} onUpdate={update} />
        ))}
      </ul>
    </div>
  );
}

function EscCard({ e, onUpdate }: { e: Esc; onUpdate: (e: Esc, b: components["schemas"]["StaffEscalationPatch"]) => Promise<void> }) {
  const [note, setNote] = useState("");
  const overdue = new Date(e.sla_due_at) < new Date() && (e.status === "open" || e.status === "assigned");
  const done = e.status === "resolved" || e.status === "closed";
  return (
    <li>
      <Card className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{e.reason.replace("_", " ")}</span>
          <Badge tone={done ? "positive" : "neutral"}>{e.status}</Badge>
          {overdue && <Badge tone="demo">Past target time</Badge>}
          <span className="text-xs text-muted">Due {new Date(e.sla_due_at).toLocaleString()} (placeholder target)</span>
        </div>
        <p className="text-xs text-muted">User {e.user_id.slice(0, 8)} · {e.assigned_to ? "assigned" : "unassigned"}</p>
        {e.note && <p className="text-sm">Note from user: {e.note}</p>}
        {e.resolution_note && <p className="text-sm">Resolution: {e.resolution_note}</p>}
        {!done && (
          <div className="space-y-2">
            <label htmlFor={`n-${e.id}`} className="sr-only">
              Resolution note
            </label>
            <textarea id={`n-${e.id}`} value={note} onChange={(ev) => setNote(ev.target.value)} maxLength={2000} rows={2} placeholder="Resolution note (shown to the user)" className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm" />
            <div className="flex gap-2">
              {e.status === "open" && (
                <Button variant="secondary" onClick={() => void onUpdate(e, { assign_to_me: true, status: "assigned" })}>
                  Assign to me
                </Button>
              )}
              <Button onClick={() => void onUpdate(e, { assign_to_me: false, status: "resolved", resolution_note: note || null })} disabled={!note.trim()}>
                Resolve
              </Button>
            </div>
          </div>
        )}
      </Card>
    </li>
  );
}
