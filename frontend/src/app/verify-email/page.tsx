"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { Alert } from "@/design-system/ui";
import { AuthShell } from "@/features/auth/auth-shell";
import { api } from "@/lib/api/client";
import { track } from "@/lib/analytics";

function Verify() {
  const token = useSearchParams().get("token");
  const [state, setState] = useState<"working" | "ok" | "bad">(token ? "working" : "bad");

  // The token is single-use, so ask the server once per token even when React runs this effect twice (dev Strict Mode).
  const asked = useRef<string | null>(null);
  useEffect(() => {
    if (!token || asked.current === token) return;
    asked.current = token;
    api.POST("/api/v1/auth/verify-email", { body: { token } }).then(({ response }) => {
      setState(response.ok ? "ok" : "bad");
      if (response.ok) track("verify_done");
    });
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
