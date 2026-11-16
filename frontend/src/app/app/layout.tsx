"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";

import { useAuth } from "@/features/auth/auth-context";
import { AppShell } from "@/features/shell/app-shell";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated" || !user)
    return (
      <main className="grid min-h-screen place-items-center text-muted" aria-busy="true">
        Loading…
      </main>
    );

  return <AppShell user={user}>{children}</AppShell>;
}
