"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { FormEvent } from "react";

import { Alert, Badge, Button, Card } from "@/design-system/ui";
import { api, problemMessage } from "@/lib/api/client";

export function PrivacyCards() {
  const qc = useQueryClient();
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const consents = useQuery({
    queryKey: ["consents"],
    queryFn: async () => (await api.GET("/api/v1/consents")).data ?? [],
  });
  const aiOn = consents.data?.some((c) => c.purpose === "ai_processing" && !c.revoked_at) ?? false;
  const toggleAi = useMutation({
    mutationFn: async () =>
      aiOn
        ? api.DELETE("/api/v1/consents/{purpose}", { params: { path: { purpose: "ai_processing" } } })
        : api.POST("/api/v1/consents", { body: { purpose: "ai_processing", text_version: "v1" } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["consents"] }),
  });

  const erasure = useQuery({
    queryKey: ["erasure"],
    queryFn: async () => (await api.GET("/api/v1/users/me/erasure-request")).data ?? null,
  });
  const cancel = useMutation({
    mutationFn: () => api.DELETE("/api/v1/users/me/erasure-request"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["erasure"] }),
  });

  async function download() {
    setMsg(null);
    const { data, response } = await api.GET("/api/v1/users/me/data-export", { parseAs: "blob" });
    if (!response.ok || !data) return setMsg({ tone: "error", text: response.status === 429 ? "Too many exports. Try again later." : "Could not create the export." });
    const url = URL.createObjectURL(data as Blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finscore-data-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg({ tone: "success", text: "Your data export has been downloaded." });
  }

  async function requestErasure(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const password = String(new FormData(form).get("password") ?? "");
    const { response, error } = await api.POST("/api/v1/users/me/erasure-request", { body: { password } });
    if (response.status === 202) {
      form.reset();
      void qc.invalidateQueries({ queryKey: ["erasure"] });
      setMsg({ tone: "success", text: "Deletion scheduled. You can cancel it until the date shown." });
    } else
      setMsg({ tone: "error", text: (error as { code?: string } | undefined)?.code === "reauth_failed" ? "That password is not correct." : problemMessage(error) });
  }

  return (
    <>
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Privacy and your data</h2>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium">AI processing of what you type</p>
            <p className="text-sm text-muted">Needed for the conversation. Turning it off stops new conversations; your saved facts stay.</p>
          </div>
          <Button variant="secondary" onClick={() => toggleAi.mutate()} loading={toggleAi.isPending}>
            {aiOn ? "Turn off" : "Turn on"}
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
          <div>
            <p className="font-medium">Download everything we hold about you</p>
            <p className="text-sm text-muted">A single JSON file: profile, facts and their history, conversations, scores, goals.</p>
          </div>
          <Button variant="secondary" onClick={download}>
            Download my data
          </Button>
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Delete my account</h2>
        {erasure.data?.pending ? (
          <>
            <Alert tone="info">
              Deletion is scheduled for <strong>{erasure.data.scheduled_for ? new Date(erasure.data.scheduled_for).toLocaleDateString("en-IN") : "soon"}</strong>. After that, all
              your personal data is permanently removed and cannot be recovered.
            </Alert>
            <Button variant="secondary" onClick={() => cancel.mutate()} loading={cancel.isPending}>
              Cancel deletion
            </Button>
          </>
        ) : (
          <form method="post" onSubmit={requestErasure} className="max-w-sm space-y-3">
            <p className="text-sm text-muted">
              There is a cooling-off period during which you can change your mind. Afterwards your data is permanently deleted. Confirm with your password.
            </p>
            <label className="block text-sm font-medium" htmlFor="erase-pw">
              Password
            </label>
            <input id="erase-pw" name="password" type="password" required autoComplete="current-password" className="min-h-[44px] w-full rounded-md border border-line bg-surface px-3 text-sm" />
            <Button type="submit" variant="danger">
              Schedule deletion
            </Button>
          </form>
        )}
      </Card>
    </>
  );
}

export function SupportCard() {
  const qc = useQueryClient();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const list = useQuery({
    queryKey: ["escalations"],
    queryFn: async () => (await api.GET("/api/v1/escalations")).data ?? [],
  });
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setError(null);
    const note = String(new FormData(form).get("note") ?? "").trim();
    const { response, error: err } = await api.POST("/api/v1/escalations", { body: { reason: "user_request", note: note || null } });
    if (!response.ok) return setError(problemMessage(err));
    form.reset();
    setSent(true);
    void qc.invalidateQueries({ queryKey: ["escalations"] });
  }
  return (
    <Card className="space-y-3">
      <h2 className="text-lg font-semibold">Talk to a person</h2>
      <p className="text-sm text-muted">I&apos;m an AI. If you want a human to look at your situation, ask here.</p>
      {sent && <Alert tone="success">Request sent. A member of our team will respond.</Alert>}
      {error && <Alert tone="error">{error}</Alert>}
      <form method="post" onSubmit={submit} className="space-y-3">
        <label htmlFor="support-note" className="block text-sm font-medium">
          What would you like help with? (optional)
        </label>
        <textarea id="support-note" name="note" maxLength={1000} rows={3} className="w-full rounded-md border border-line bg-surface p-3 text-sm" />
        <Button type="submit">Ask a person</Button>
      </form>
      {list.data && list.data.length > 0 && (
        <ul className="divide-y divide-line text-sm">
          {list.data.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                {e.note ?? "(no note)"} <span className="text-muted">· {new Date(e.created_at).toLocaleDateString("en-IN")}</span>
                {e.resolution_note && <span className="block text-muted">Reply: {e.resolution_note}</span>}
              </span>
              <Badge tone={e.status === "resolved" || e.status === "closed" ? "positive" : "neutral"}>{e.status}</Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
