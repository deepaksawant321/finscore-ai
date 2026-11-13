"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";

import { Alert, Button, Input } from "@/design-system/ui";
import { AuthShell } from "@/features/auth/auth-shell";
import { api } from "@/lib/api/client";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    await api.POST("/api/v1/auth/password/forgot", { body: { email: String(new FormData(e.currentTarget).get("email")) } });
    setBusy(false);
    setSent(true);
  }

  return (
    <AuthShell title="Reset your password" subtitle="We'll email you a reset link if the account exists.">
      {sent ? (
        <Alert tone="success">If an account exists for that email, a reset link has been sent.</Alert>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <Input name="email" type="email" label="Email" autoComplete="email" required />
          <Button type="submit" loading={busy} className="w-full">
            Send reset link
          </Button>
        </form>
      )}
      <Link href="/login" className="text-sm text-ai underline">
        Back to log in
      </Link>
    </AuthShell>
  );
}
