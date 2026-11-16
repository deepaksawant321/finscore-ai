"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { useAuth } from "@/features/auth/auth-context";
import type { User } from "@/features/auth/auth-context";
import { useOrgs } from "@/features/workspace/api";
import { navGroups } from "@/lib/nav";
import type { WorkspaceState } from "@/lib/nav";

import { DemoBar } from "./demo-bar";
import { MobileTabs } from "./mobile-tabs";
import { Rail } from "./rail";
import { Topbar } from "./topbar";

/** Signed-in layout: glass rail on desktop, floating tab bar on phones, top bar and content. Rendered only for an authenticated user. */
export function AppShell({ user, children }: { user: User; children: ReactNode }) {
  const { logout } = useAuth();
  const router = useRouter();
  const orgs = useOrgs();
  const workspace: WorkspaceState = orgs.isLoading || orgs.isError ? "unknown" : (orgs.data?.length ?? 0) > 0 ? "member" : "none";
  const groups = navGroups(user.roles ?? [], workspace);

  const onLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2">
        Skip to content
      </a>
      <Rail groups={groups} />
      <div className="flex min-w-0 flex-col">
        <DemoBar />
        <Topbar user={user} onLogout={onLogout} />
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl px-4 pb-32 pt-2 lg:px-8 lg:pb-14">
          {children}
        </main>
      </div>
      <MobileTabs groups={groups} onLogout={onLogout} />
    </div>
  );
}
