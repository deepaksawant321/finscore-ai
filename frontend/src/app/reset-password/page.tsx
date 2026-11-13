"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import type { FormEvent } from "react";

import { Alert, Button, Input } from "@/design-system/ui";
import { AuthShell } from "@/features/auth/auth-shell";
import { api, problemMessage } from "@/lib/api/client";

function Reset() {
  const token = useSearchParams().get("token") ?? "";
  const [state, setState] = useState<"form" | "done">("form");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { response, error: err } = await api.POST("/api/v1/auth/password/reset", {
      body: { token, new_password: String(new FormData(e.currentTarget).get("password")) },
    });
    setBusy(false);
    if (response.ok) setState("done");
    else setError(problemMessage(err));
  }

  return (
    <AuthShell title="Choose a new password">
      {state === "done" ? (
        <Alert tone="success">Password updated. All other sessions were signed out.</Alert>
      ) : (
        <form method="post" onSubmit={onSubmit} className="space-y-4" noValidate>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <Input
            name="password"
            type="password"
            label="New password"
            autoComplete="new-password"
            required
            hint="At least 10 characters with upper and lower case letters and a digit."
          />
          <Button type="submit" loading={busy} className="w-full" disabled={!token}>
            Update password
          </Button>
        </form>
      )}
      <Link href="/login" className="text-sm text-ai underline">
        Go to log in
      </Link>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <Reset />
    </Suspense>
  );
}
