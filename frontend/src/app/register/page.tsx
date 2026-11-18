"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { Alert, Button, Input } from "@/design-system/ui";
import { AuthShell } from "@/features/auth/auth-shell";
import { LEGAL_TEXT_VERSION } from "@/features/legal/content";
import { api, problemMessage } from "@/lib/api/client";
import { track } from "@/lib/analytics";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => track("register_view"), []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    track("register_submit");
    if (f.get("accept_terms") !== "on") track("register_error", { code: "terms_not_accepted" });
    if (f.get("accept_terms") !== "on") return setError("Please accept the Terms of Use and Privacy Notice to create an account.");
    setBusy(true);
    setError(null);
    const { response, error: err } = await api.POST("/api/v1/auth/register", {
      body: {
        email: String(f.get("email")),
        password: String(f.get("password")),
        full_name: String(f.get("full_name") || "") || null,
        accept_terms: f.get("accept_terms") === "on",
        terms_version: LEGAL_TEXT_VERSION,
      },
    });
    setBusy(false);
    if (response.status !== 202) track("register_error", { code: String((err as { code?: string } | undefined)?.code ?? response.status) });
    if (response.status === 202) {
      track("register_done");
      setDone(true);
    }
    else if (response.status === 409) setError("Our terms were just updated. Please reload the page and review them.");
    else setError(response.status === 429 ? "Too many attempts. Please try later." : problemMessage(err));
  }

  if (done)
    return (
      <AuthShell title="Check your email">
        <Alert tone="success">If this address can be registered, a verification link is on its way. It expires in one hour.</Alert>
        <Link href="/login" className="text-sm text-ai underline">
          Back to log in
        </Link>
      </AuthShell>
    );

  return (
    <AuthShell title="Create your account" subtitle="Free to start. No questionnaire — just a conversation.">
      <form method="post" onSubmit={onSubmit} className="space-y-4" noValidate>
        {error ? <Alert tone="error">{error}</Alert> : null}
        <Input name="full_name" label="Name (optional)" autoComplete="name" />
        <Input name="email" type="email" label="Email" autoComplete="email" required />
        <Input
          name="password"
          type="password"
          label="Password"
          autoComplete="new-password"
          required
          hint="At least 10 characters with upper and lower case letters and a digit."
        />
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="accept_terms" required className="mt-0.5 h-5 w-5 shrink-0 accent-[rgb(var(--brand))]" />
          <span>
            I agree to the{" "}
            <Link href="/terms" target="_blank" className="text-ai underline">
              Terms of Use
            </Link>{" "}
            and have read the{" "}
            <Link href="/privacy" target="_blank" className="text-ai underline">
              Privacy Notice
            </Link>
            . FinScore gives education, not investment advice.
          </span>
        </label>
        <Button type="submit" loading={busy} className="w-full">
          Create account
        </Button>
      </form>
      <p className="text-sm text-muted">
        Already registered?{" "}
        <Link href="/login" className="text-ai underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
