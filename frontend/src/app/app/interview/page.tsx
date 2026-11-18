"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import { Alert, Badge, Button, Card } from "@/design-system/ui";
import { api, problemMessage } from "@/lib/api/client";
import { formatInr } from "@/lib/format";
import type { components } from "@/lib/api/schema";

type Proposal = components["schemas"]["ProposalOut"];
type Msg = { id: string; role: string; content: string };

export default function InterviewPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [phase, setPhase] = useState<"consent" | "loading" | "chat">("loading");
  const [convId, setConvId] = useState<string | null>(null);
  const [disclosure, setDisclosure] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [progress, setProgress] = useState<{ known: number; total: number } | null>(null);
  const [ready, setReady] = useState(false);
  const [escSuggested, setEscSuggested] = useState(false);
  const [escSent, setEscSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  async function begin() {
    setError(null);
    const { data, response, error: err } = await api.POST("/api/v1/conversations", { body: { mode: "problem" } });
    if (data) {
      setConvId(data.id);
      setDisclosure(data.disclosure);
      setMessages(data.messages.map((m) => ({ id: m.id, role: m.role, content: m.content })));
      setPhase("chat");
    } else if ((err as { code?: string } | undefined)?.code === "consent_required") setPhase("consent");
    else {
      setError(problemMessage(err, `Could not start (${response.status}).`));
      setPhase("consent");
    }
  }

  useEffect(() => {
    void begin();
  }, []);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function grantConsent() {
    await api.POST("/api/v1/consents", { body: { purpose: "ai_processing", text_version: "v1" } });
    setPhase("loading");
    await begin();
  }

  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const content = String(new FormData(form).get("content") ?? "").trim();
    if (!content || !convId) return;
    form.reset();
    setBusy(true);
    setError(null);
    setMessages((m) => [...m, { id: `u${m.length}`, role: "user", content }]);
    const { data, error: err } = await api.POST("/api/v1/conversations/{conv_id}/messages", { params: { path: { conv_id: convId } }, body: { content } });
    setBusy(false);
    if (!data) return setError(problemMessage(err));
    setMessages((m) => [...m, { id: data.message_id, role: "assistant", content: data.assistant_text }]);
    setProposals((p) => [...p, ...data.proposals]);
    setProgress(data.progress as { known: number; total: number });
    setReady(data.ready_for_score);
    setEscSuggested(data.escalation_suggested && !data.escalation_id);
    if (data.escalation_id) setEscSent(true);
  }

  async function decide(p: Proposal, action: "accept" | "reject" | "edit", value?: string) {
    if (!convId) return;
    const { error: err } = await api.POST("/api/v1/conversations/{conv_id}/facts/confirm", {
      params: { path: { conv_id: convId } },
      body: { decisions: [{ proposal_id: p.id, action, value: value ?? null }] },
    });
    if (err) return setError(problemMessage(err));
    if (p.status === "auto_saved") {
      // Undo drops the saved value; Change keeps it in the saved list with the new value. Confirming is not needed.
      if (action === "reject") {
        setProposals((all) => all.filter((x) => x.id !== p.id));
        setProgress((pr) => (pr ? { ...pr, known: Math.max(0, pr.known - 1) } : pr));
      } else if (value !== undefined) {
        const display = p.display.startsWith("₹") && Number.isFinite(Number(value)) ? formatInr(Number(value)) : value;
        setProposals((all) => all.map((x) => (x.id === p.id ? { ...x, status: "edited", value, display } : x)));
      }
    } else {
      setProposals((all) => all.filter((x) => x.id !== p.id));
      if (action !== "reject") setProgress((pr) => (pr ? { ...pr, known: pr.known + 1 } : pr));
    }
    void qc.invalidateQueries({ queryKey: ["facts"] });
  }

  const toCheck = proposals.filter((p) => p.status === "pending");
  const saved = proposals.filter((p) => p.status === "auto_saved" || p.status === "edited");

  async function askPerson() {
    if (!convId) return;
    const { response, error: err } = await api.POST("/api/v1/escalations", { body: { reason: "regulated_question", conversation_id: convId, note: null } });
    if (!response.ok) return setError(problemMessage(err));
    setEscSuggested(false);
    setEscSent(true);
  }

  async function reveal() {
    setBusy(true);
    const { error: err } = await api.POST("/api/v1/score/compute");
    setBusy(false);
    if (err) return setError(problemMessage(err));
    await qc.invalidateQueries({ queryKey: ["score"] });
    router.push("/app");
  }

  if (phase === "loading") return <p className="text-muted">Loading…</p>;

  if (phase === "consent")
    return (
      <Card className="max-w-xl space-y-4">
        <h1 className="font-display text-3xl font-bold tracking-tight">Before we talk</h1>
        {error && <Alert tone="error">{error}</Alert>}
        <p className="text-sm text-muted">
          To understand your situation I process what you type using an AI model. Clear answers are saved as you go and anything unclear waits for
          you to check it. You can see, undo and correct everything any time, and you can withdraw this permission in Settings. I am an AI
          assistant, not a human adviser.
        </p>
        <Button onClick={grantConsent}>I agree — let&apos;s talk</Button>
      </Card>
    );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <section aria-label="Conversation" className="flex min-h-[60vh] flex-col gap-3">
        <Alert>{disclosure}</Alert>
        <Card className="flex flex-1 flex-col gap-3 overflow-y-auto" >
          <ul className="space-y-3" aria-live="polite">
            {messages.map((m) => (
              <li key={m.id} className={m.role === "user" ? "ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-ai-gradient px-4 py-2.5 text-white shadow-glow-ai" : "max-w-[85%] rounded-2xl rounded-bl-md border border-line bg-surface-2 px-4 py-2.5"}>
                <span className="sr-only">{m.role === "user" ? "You: " : "FinScore AI: "}</span>
                {m.content}
              </li>
            ))}
            {busy && <li className="text-sm text-muted">Thinking…</li>}
          </ul>
          <div ref={endRef} />
        </Card>
        {escSuggested && (
          <Alert tone="info">
            That needs a qualified human. <button type="button" onClick={askPerson} className="font-semibold underline">Ask a person to review my question</button>
          </Alert>
        )}
        {escSent && <Alert tone="success">A person on our team has been asked to follow up. You can see the request in Settings.</Alert>}
        {error && <Alert tone="error">{error}</Alert>}
        <form onSubmit={send} className="flex gap-2">
          <label htmlFor="msg" className="sr-only">
            Your message
          </label>
          <input id="msg" name="content" autoComplete="off" maxLength={2000} placeholder="Tell me in your own words…" className="min-h-[44px] flex-1 rounded-md border border-line bg-surface px-3 text-sm" />
          <Button type="submit" loading={busy}>
            Send
          </Button>
        </form>
      </section>

      <aside className="space-y-4" aria-label="Captured facts">
        {toCheck.length > 0 && (
          <Card className="space-y-3">
            <h2 className="font-semibold">Please check</h2>
            <p className="text-xs text-muted">I wasn&apos;t sure about these, so they are not saved yet.</p>
            <ul className="space-y-3">
              {toCheck.map((p) => (
                <ProposalCard key={p.id} p={p} onDecide={decide} />
              ))}
            </ul>
          </Card>
        )}
        <Card className="space-y-3">
          <h2 className="font-semibold">Saved from your answers</h2>
          {saved.length === 0 ? (
            <p className="text-sm text-muted">Nothing yet. Clear answers are saved here as we talk.</p>
          ) : (
            <ul className="divide-y divide-line">
              {saved.map((p) => (
                <SavedRow key={p.id} p={p} onDecide={decide} />
              ))}
            </ul>
          )}
          <p className="text-xs text-muted">You can also review everything on the Memory page.</p>
        </Card>
        {progress && (
          <Card>
            <p className="text-sm">
              <span className="font-semibold tabular-nums">
                {progress.known}/{progress.total}
              </span>{" "}
              details known
            </p>
            <div className="mt-2 h-2 rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.known}>
              <div className="h-2 rounded-full bg-brand transition-all" style={{ width: `${(progress.known / progress.total) * 100}%` }} />
            </div>
          </Card>
        )}
        {ready && (
          <Button onClick={reveal} loading={busy} className="w-full">
            Show my FinScore
          </Button>
        )}
      </aside>
    </div>
  );
}

function ProposalCard({ p, onDecide }: { p: Proposal; onDecide: (p: Proposal, a: "accept" | "reject" | "edit", v?: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(p.value);
  return (
    <li className="space-y-2 rounded-md border border-line p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{p.label}</span>
        {Number(p.confidence) < 0.8 && <Badge tone="demo">Please check</Badge>}
      </div>
      {editing ? (
        <div className="flex gap-2">
          <input aria-label={`Corrected ${p.label}`} value={val} onChange={(e) => setVal(e.target.value)} className="min-h-[40px] w-full rounded-md border border-line bg-surface px-2 text-sm" />
          <Button onClick={() => onDecide(p, "edit", val)}>Save</Button>
        </div>
      ) : (
        <p className="text-lg font-semibold tabular-nums">{p.display}</p>
      )}
      <p className="text-xs text-muted">
        You said: “{p.evidence}” · {p.rationale}
      </p>
      {!editing && (
        <div className="flex gap-2">
          <Button onClick={() => onDecide(p, "accept")}>Confirm</Button>
          <Button variant="secondary" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button variant="ghost" onClick={() => onDecide(p, "reject")}>
            Wrong
          </Button>
        </div>
      )}
    </li>
  );
}

function SavedRow({ p, onDecide }: { p: Proposal; onDecide: (p: Proposal, a: "accept" | "reject" | "edit", v?: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(p.value);
  const canChange = p.status === "auto_saved";
  return (
    <li className="space-y-1 py-2 first:pt-0 last:pb-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm text-muted">{p.label}</span>
        {!editing && <span className="font-semibold tabular-nums">{p.display}</span>}
      </div>
      {editing ? (
        <div className="flex gap-2">
          <input aria-label={`Corrected ${p.label}`} value={val} onChange={(e) => setVal(e.target.value)} className="min-h-[40px] w-full rounded-md border border-line bg-surface px-2 text-sm" />
          <Button
            onClick={() => {
              onDecide(p, "edit", val);
              setEditing(false);
            }}
          >
            Save
          </Button>
        </div>
      ) : (
        canChange && (
          <div className="flex gap-3 text-xs">
            <button type="button" className="font-semibold text-brand underline-offset-2 hover:underline" onClick={() => setEditing(true)}>
              Change
            </button>
            <button type="button" className="text-muted underline-offset-2 hover:underline" onClick={() => onDecide(p, "reject")} aria-label={`Undo ${p.label}`}>
              Undo
            </button>
          </div>
        )
      )}
    </li>
  );
}
