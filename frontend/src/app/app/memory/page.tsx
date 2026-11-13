"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Alert, Badge, Button, Card } from "@/design-system/ui";
import { api, problemMessage } from "@/lib/api/client";

const SOURCE_LABEL: Record<string, string> = {
  USER_STATED: "You told me",
  CONNECTED: "Connected account",
  DERIVED: "Calculated",
  INFERRED: "Inferred",
  ESTIMATED: "Estimated",
};

export default function MemoryPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [val, setVal] = useState("");
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const facts = useQuery({
    queryKey: ["facts"],
    queryFn: async () => {
      const { data } = await api.GET("/api/v1/memory/facts");
      if (!data) throw new Error("facts failed");
      return data;
    },
  });
  const save = useMutation({
    mutationFn: async (v: { key: string; value: string }) => {
      const { data, error } = await api.PATCH("/api/v1/profile/facts/{key}", { params: { path: { key: v.key } }, body: { value: v.value } });
      if (!data) throw new Error(problemMessage(error));
      return data;
    },
    onSuccess: (r) => {
      setEditing(null);
      setMsg({ tone: "success", text: r.changed ? (r.material_change ? "Updated. That is a big change — your score will be recalculated." : "Updated.") : "No change." });
      void qc.invalidateQueries({ queryKey: ["facts"] });
    },
    onError: (e: Error) => setMsg({ tone: "error", text: e.message }),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">What I know about you</h1>
      <p className="text-sm text-muted">Every fact has a source. You own this information: correct anything that is wrong. Old values are kept in history, never silently overwritten.</p>
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      {facts.isLoading && <p className="text-muted">Loading…</p>}
      {facts.data?.length === 0 && <Card className="text-muted">Nothing yet. Facts appear here after you confirm them in the conversation.</Card>}
      <ul className="space-y-3">
        {facts.data?.map((f) => (
          <li key={f.id}>
            <Card className="flex flex-wrap items-center justify-between gap-3 !p-4">
              <div>
                <p className="text-sm text-muted">{f.label}</p>
                {editing === f.field_key ? (
                  <input aria-label={`New value for ${f.label}`} value={val} onChange={(e) => setVal(e.target.value)} className="mt-1 min-h-[40px] rounded-md border border-line bg-surface px-2" />
                ) : (
                  <p className="text-lg font-semibold tabular-nums">
                    {f.value === "true" ? "Yes" : f.value === "false" ? "No" : f.value} {f.display_unit && <span className="text-xs font-normal text-muted">{f.display_unit}</span>}
                  </p>
                )}
                <div className="mt-1 flex flex-wrap gap-2">
                  <Badge>{SOURCE_LABEL[f.source_type] ?? f.source_type}</Badge>
                  <Badge>{f.verification_state === "verified" ? "Verified" : "Not verified"}</Badge>
                  <span className="text-xs text-muted">since {new Date(f.valid_from).toLocaleDateString("en-IN")}</span>
                </div>
              </div>
              {editing === f.field_key ? (
                <div className="flex gap-2">
                  <Button onClick={() => save.mutate({ key: f.field_key, value: val })} loading={save.isPending}>
                    Save
                  </Button>
                  <Button variant="ghost" onClick={() => setEditing(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditing(f.field_key);
                    setVal(f.value);
                  }}
                >
                  Correct
                </Button>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
