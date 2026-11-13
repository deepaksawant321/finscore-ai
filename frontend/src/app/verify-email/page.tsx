"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { Alert } from "@/design-system/ui";
import { AuthShell } from "@/features/auth/auth-shell";
import { api } from "@/lib/api/client";

function Verify() {
  const token = useSearchParams().get("token");
  const [state, setState] = useState<"working" | "ok" | "bad">(token ? "working" : "bad");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api.POST("/api/v1/auth/verify-email", { body: { token } }).then(({ response }) => {
      if (!cancelled) setState(response.ok ? "ok" : "bad");
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <AuthShell title="Email verification">
      {state === "working" && <Alert>Verifying…</Alert>}
      {state === "ok" && <Alert tone="success">Your email is verified. You can now log in.</Alert>}
      {state === "bad" && <Alert tone="error">This link is invalid or has expired. Please register again or request a new link.</Alert>}
      <Link href="/login" className="text-sm text-ai underline">
        Go to log in
      </Link>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <Verify />
    </Suspense>
  );
}
