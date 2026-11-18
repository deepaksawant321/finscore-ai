"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import { Alert, Badge, Button, Card } from "@/design-system/ui";
import { api, problemMessage } from "@/lib/api/client";
import { track } from "@/lib/analytics";

type Msg = { id: string; role: string; content: string; adviceClass?: string | null; ai?: boolean };

export default function CoachPage() {
  const [phase, setPhase] = useState<"consent" | "loading" | "chat">("loading");
  const [convId, setConvId] = useState<string | null>(null);
  const [disclosure, setDisclosure] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [prompts, setPrompts] = useState<string[]>([]);
  const [escSent, setEscSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  async function begin() {
    setError(null);
    const { data, response, error: err } = await api.POST("/api/v1/coach/conversations");
    if (data) {
      setConvId(data.id);
      setDisclosure(data.disclosure);
      setPrompts(data.suggested_prompts);
      setMessages(data.messages.map((m) => ({ id: m.id, role: m.role, content: m.content, adviceClass: m.advice_class })));
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

  async function ask(content: string) {
    if (!content.trim() || !convId || busy) return;
    setBusy(true);
    setError(null);
    setMessages((m) => [...m, { id: `u${m.length}`, role: "user", content }]);
    const { data, error: err } = await api.POST("/api/v1/coach/conversations/{conv_id}/messages", {
      params: { path: { conv_id: convId } },
      body: { content },
    });
    setBusy(false);
    if (!data) return setError(problemMessage(err));
    track("coach_ask", { routed_to: data.mode });
    setMessages((m) => [...m, { id: data.message_id, role: "assistant", content: data.assistant_text, adviceClass: data.advice_class, ai: data.ai_rewritten }]);
    if (data.escalation_id) setEscSent(true);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const content = String(new FormData(form).get("content") ?? "").trim();
    form.reset();
    void ask(content);
  }

  if (phase === "loading") return <p className="text-muted">Loading…</p>;

  if (phase === "consent")
    return (
      <Card className="max-w-xl space-y-4">
        <h1 className="font-display text-3xl font-bold tracking-tight">Before we talk</h1>
        {error && <Alert tone="error">{error}</Alert>}
        <p className="text-sm text-muted">
          The coach uses an AI model to word its answers. Every number comes from a calculation engine, never from the AI. You can withdraw this
          permission in Settings. The coach is an AI, not a human adviser.
        </p>
        <Button onClick={grantConsent}>I agree — start the coach</Button>
      </Card>
    );

  return (
    <div className="max-w-3xl space-y-3">
      <h1 className="font-display text-3xl font-bold tracking-tight">Coach</h1>
      <Alert>{disclosure}</Alert>
      <Card className="space-y-3">
        <ul className="space-y-3" aria-live="polite" aria-label="Conversation">
          {messages.map((m) => (
            <li key={m.id} className={m.role === "user" ? "ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-ai-gradient px-4 py-2.5 text-white shadow-glow-ai" : "max-w-[85%] rounded-2xl rounded-bl-md border border-line bg-surface-2 px-4 py-2.5"}>
              <span className="sr-only">{m.role === "user" ? "You: " : "Coach: "}</span>
              <span className="whitespace-pre-line">{m.content}</span>
              {m.role === "assistant" && m.ai !== undefined && (
                <span className="mt-1 block">
                  <Badge tone="neutral">{m.ai ? "AI-worded · numbers from engine" : "Numbers from engine"}</Badge>
                </span>
              )}
            </li>
          ))}
          {busy && <li className="text-sm text-muted">Thinking…</li>}
        </ul>
        <div ref={endRef} />
      </Card>
      {escSent && <Alert tone="success">A person on our team has been asked to follow up. You can see the request in Settings.</Alert>}
      {error && <Alert tone="error">{error}</Alert>}
      <div className="flex flex-wrap gap-2" aria-label="Suggested questions">
        {prompts.map((p) => (
          <Button key={p} variant="secondary" onClick={() => void ask(p)} disabled={busy}>
            {p}
          </Button>
        ))}
      </div>
      <form onSubmit={onSubmit} method="post" className="flex gap-2">
        <label htmlFor="coach-msg" className="sr-only">
          Your question
        </label>
        <input id="coach-msg" name="content" autoComplete="off" maxLength={1000} placeholder="Ask about your score, goals or data…" className="min-h-[44px] flex-1 rounded-md border border-line bg-surface px-3 text-sm" />
        <Button type="submit" loading={busy}>
          Send
        </Button>
      </form>
    </div>
  );
}
