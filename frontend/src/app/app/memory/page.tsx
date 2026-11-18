"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Alert, Badge, Button, Card, SourceBadge, sourceFromApi } from "@/design-system/ui";
import { api, problemMessage } from "@/lib/api/client";
import { formatInr } from "@/lib/format";

const isInr = (unit: string) => unit.toUpperCase().startsWith("INR");
/** "INR/year" -> "/ year"; plain "INR" -> "" (the rupee sign already says it). */
const inrSuffix = (unit: string) => (unit.includes("/") ? `/ ${unit.split("/")[1]}` : "");

/** Rupee amounts read as Indian-grouped money; booleans as Yes/No; everything else is shown as stored. */
function showValue(value: string, unit?: string | null): string {
  if (value === "true") return "Yes";
  if (value === "false") return "No";
  const n = Number(value);
  if (unit && isInr(unit) && value.trim() !== "" && Number.isFinite(n)) return formatInr(n);
  return value;
}

/** Auto-saved from the conversation and not yet confirmed: confirmed or corrected facts carry confidence 1. */
const fromChatUnconfirmed = (f: { source_ref?: string | null; confidence: string }) => Boolean(f.source_ref?.startsWith("message:")) && Number(f.confidence) < 1;

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
    onSuccess: async (r) => {
      setEditing(null);
      void qc.invalidateQueries({ queryKey: ["facts"] });
      void qc.invalidateQueries({ queryKey: ["improve"] });
      if (!r.changed) return setMsg({ tone: "success", text: "Saved." });
      if (!r.material_change) return setMsg({ tone: "success", text: "Updated." });
      // A big change: the stored score is stale until it is computed again, so do it now rather than only promising it.
      const { error } = await api.POST("/api/v1/score/compute");
      await Promise.all([qc.invalidateQueries({ queryKey: ["score"] }), qc.invalidateQueries({ queryKey: ["actions"] }), qc.invalidateQueries({ queryKey: ["nudges"] })]);
      setMsg(
        error
          ? { tone: "error", text: "Updated, but I could not recalculate your score just now. Open your score page to try again." }
          : { tone: "success", text: "Updated. That is a big change, so I recalculated your score." },
      );
    },
    onError: (e: Error) => setMsg({ tone: "error", text: e.message }),
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold tracking-tight">What I know about you</h1>
      <p className="text-sm text-muted">Every fact has a source. You own this information: correct anything that is wrong. Old values are kept in history, never silently overwritten.</p>
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      {facts.isLoading && <p className="text-muted">Loading…</p>}
      {facts.data?.length === 0 && <Card className="text-muted">Nothing yet. Facts appear here as you answer questions in the conversation.</Card>}
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
                    {showValue(f.value, f.display_unit)}{" "}
                    {f.display_unit && !isInr(f.display_unit) && <span className="text-xs font-normal text-muted">{f.display_unit}</span>}
                    {f.display_unit && isInr(f.display_unit) && <span className="text-xs font-normal text-muted">{inrSuffix(f.display_unit)}</span>}
                  </p>
                )}
                <div className="mt-1 flex flex-wrap gap-2">
                  <SourceBadge source={sourceFromApi(f.source_type)} />
                  <Badge>{f.verification_state === "verified" ? "Verified" : "Not verified"}</Badge>
                  {fromChatUnconfirmed(f) && <Badge tone="demo">Saved from chat · not confirmed</Badge>}
                  {f.source_type === "ESTIMATED" && <Badge tone="demo">Assumed · change it if it is wrong</Badge>}
                  {f.source_type === "DERIVED" && <span className="text-xs text-muted">Worked out from your other answers</span>}
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
                <div className="flex gap-2">
                  {(fromChatUnconfirmed(f) || f.source_type === "ESTIMATED") && (
                    <Button onClick={() => save.mutate({ key: f.field_key, value: f.value })} loading={save.isPending}>
                      {f.source_type === "ESTIMATED" ? "That's right" : "Confirm"}
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditing(f.field_key);
                      setVal(f.value);
                    }}
                  >
                    Correct
                  </Button>
                </div>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
