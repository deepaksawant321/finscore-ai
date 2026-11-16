"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { Alert, buttonClass } from "@/design-system/ui";
import { useAuth } from "@/features/auth/auth-context";
import { AuthShell } from "@/features/auth/auth-shell";
import { unwrap } from "@/features/workspace/api";
import { api } from "@/lib/api/client";

function Accept() {
  const token = useSearchParams().get("token");
  const { status } = useAuth();
  const [state, setState] = useState<"working" | "joined" | "bad">(token ? "working" : "bad");
  const [workspace, setWorkspace] = useState("");
  const asked = useRef<string | null>(null); // the invite is single-use: ask once per token even when React runs this effect twice

  useEffect(() => {
    if (!token || status !== "authenticated" || asked.current === token) return;
    asked.current = token;
    unwrap(api.POST("/api/v1/orgs/invites/accept", { body: { token } }))
      .then((o) => {
        setWorkspace(o.name);
        setState("joined");
      })
      .catch(() => setState("bad"));
  }, [token, status]);

  return (
    <AuthShell title="Join a workspace">
      {status === "loading" && <Alert>Checking your sign-in…</Alert>}
      {status === "anonymous" && token && (
        <>
          <Alert tone="info">Log in with the email address this invitation was sent to, then open the link from the email again.</Alert>
          <Link href="/login" className={buttonClass("primary")}>
            Log in
          </Link>
        </>
      )}
      {status === "authenticated" && state === "working" && <Alert>Joining…</Alert>}
      {state === "joined" && (
        <>
          <Alert tone="success">You have joined {workspace}.</Alert>
          <Link href="/app/workspace/setup" className={buttonClass("primary")}>
            Open the workspace
          </Link>
        </>
      )}
      {state === "bad" && <Alert tone="error">This invitation is invalid or has expired. Ask your admin to send a new one, and make sure you are logged in with the invited email address.</Alert>}
    </AuthShell>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense>
      <Accept />
    </Suspense>
  );
}
