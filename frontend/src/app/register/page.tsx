"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";

import { Alert, Button, Input } from "@/design-system/ui";
import { AuthShell } from "@/features/auth/auth-shell";
import { api, problemMessage } from "@/lib/api/client";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const { response, error: err } = await api.POST("/api/v1/auth/register", {
      body: { email: String(f.get("email")), password: String(f.get("password")), full_name: String(f.get("full_name") || "") || null },
    });
    setBusy(false);
    if (response.status === 202) setDone(true);
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
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
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
