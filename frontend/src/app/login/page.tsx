"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

import { Alert, Button, Input } from "@/design-system/ui";
import { useAuth } from "@/features/auth/auth-context";
import { AuthShell } from "@/features/auth/auth-shell";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const err = await login(String(f.get("email")), String(f.get("password")));
    setBusy(false);
    if (err) setError(err);
    else router.push("/app");
  }

  return (
    <AuthShell title="Welcome back" subtitle="Log in to continue your financial journey.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error ? <Alert tone="error">{error}</Alert> : null}
        <Input name="email" type="email" label="Email" autoComplete="email" required />
        <Input name="password" type="password" label="Password" autoComplete="current-password" required />
        <Button type="submit" loading={busy} className="w-full">
          Log in
        </Button>
      </form>
      <div className="flex justify-between text-sm">
        <Link href="/forgot-password" className="text-ai underline">
          Forgot password?
        </Link>
        <Link href="/register" className="text-ai underline">
          Create account
        </Link>
      </div>
    </AuthShell>
  );
}
