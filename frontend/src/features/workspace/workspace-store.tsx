"use client";

import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import { Alert, Button, Card, Icon, useToast } from "@/design-system/ui";
import { copyToClipboard } from "@/design-system/clipboard";
import { api } from "@/lib/api/client";
import { sanitizeTheme } from "@/lib/theme/tenant-theme";
import { useWorkspaceTheme } from "@/lib/theme/theme-provider";
import { track } from "@/lib/analytics";

import { orgKeys, unwrap, useOrgDetail, useOrgs } from "./api";
import type { BrandingBody, Org } from "./api";
import { canGoLive, checklistView, remainingSteps, themeFromBranding } from "./logic";
import type { ChecklistView } from "./logic";
import { PageHead } from "./page-head";

const CHOSEN = "fs-workspace-id";

export type Result = { ok: true } | { ok: false; reason: string };
type Secret = { label: string; value: string };

type Ctx = {
  org: Org;
  orgId: string;
  can: (permission: string) => boolean;
  items: ChecklistView[];
  remaining: number;
  ready: boolean;
  /** Runs a call, refreshes everything that depends on the workspace, and turns a failure into a message instead of a throw. */
  run: (fn: () => Promise<unknown>, success?: string) => Promise<Result>;
  refresh: () => Promise<void>;
  showSecret: (label: string, value: string) => void;
  saveBranding: (b: BrandingBody) => Promise<Result>;
  resetBranding: () => Promise<Result>;
  setModules: (ids: string[]) => Promise<Result>;
  toggleConnector: (id: string, on: boolean) => Promise<Result>;
  markSnippetCopied: () => void;
  setEnvironment: (env: "sandbox" | "live") => Promise<Result>;
};

const WorkspaceCtx = createContext<Ctx | null>(null);

function readChosen(): string | null {
  try {
    return localStorage.getItem(CHOSEN);
  } catch {
    return null;
  }
}

/** Shown once, right after a secret key is created. The server keeps only a hash, so this is the only time it can be copied. */
function SecretReveal({ secret, onClose }: { secret: Secret; onClose: () => void }) {
  const toast = useToast();
  return (
    <Alert tone="info">
      <div className="space-y-2">
        <p className="font-semibold">{secret.label}</p>
        <p className="text-sm">Copy it now and store it somewhere safe. For your security it is shown only once and cannot be viewed again.</p>
        <code className="block break-all rounded-md bg-surface-2 px-3 py-2 font-mono text-xs">{secret.value}</code>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={async () => toast((await copyToClipboard(secret.value)) ? "Key copied" : "Select the key and copy it")}>
            <Icon name="copy" size={14} /> Copy key
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            I have saved it
          </Button>
        </div>
      </div>
    </Alert>
  );
}

function CreateWorkspace({ onCreated }: { onCreated: (id: string, secret: string) => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await unwrap(api.POST("/api/v1/orgs", { body: { name } }));
      track("workspace_created");
      await qc.invalidateQueries({ queryKey: orgKeys.list });
      onCreated(created.org.id, created.secret_key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the workspace.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <PageHead title="Put FinScore inside your product" description="Create a workspace to get sandbox API keys, brand the widget and invite your team. Free to start, no card needed." />
      <Card className="space-y-4">
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="ws-name" className="text-sm font-medium">
              Workspace name
            </label>
            <input id="ws-name" required minLength={2} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Northstar Bank" className="min-h-[44px] w-full rounded-lg border border-line bg-surface px-3.5 text-sm" />
          </div>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <Button type="submit" loading={busy}>
            Create workspace
          </Button>
        </form>
        <p className="text-xs text-muted">You become the owner. You can invite people and change plan later.</p>
      </Card>
    </div>
  );
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { setTheme, reset } = useWorkspaceTheme();
  const orgs = useOrgs();
  const [chosen, setChosen] = useState<string | null>(null);
  const [secret, setSecret] = useState<Secret | null>(null);

  useEffect(() => setChosen(readChosen()), []);
  const orgId = useMemo(() => {
    const list = orgs.data ?? [];
    return list.find((o) => o.id === chosen)?.id ?? list[0]?.id;
  }, [orgs.data, chosen]);
  const detail = useOrgDetail(orgId);
  const org = detail.data;

  // The saved branding is the workspace's look: apply it whenever it changes on the server.
  const brandingKey = org ? JSON.stringify(org.branding ?? null) : "";
  useEffect(() => {
    if (!org) return;
    const t = themeFromBranding(org.branding);
    if (t) setTheme(sanitizeTheme(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org?.id, brandingKey]);
  // Leaving the workspace screens (including logging out from them) restores the default brand everywhere else.
  useEffect(() => () => reset(), [reset]);

  const refresh = useCallback(async () => {
    if (!orgId) return;
    await Promise.all([qc.invalidateQueries({ queryKey: orgKeys.detail(orgId) }), qc.invalidateQueries({ queryKey: orgKeys.list })]);
    await qc.invalidateQueries({ queryKey: ["org", orgId] });
  }, [qc, orgId]);

  const run = useCallback(
    async (fn: () => Promise<unknown>, success?: string): Promise<Result> => {
      try {
        await fn();
        await refresh();
        if (success) toast(success);
        return { ok: true };
      } catch (e) {
        const reason = e instanceof Error ? e.message : "Something went wrong. Please try again.";
        toast(reason);
        return { ok: false, reason };
      }
    },
    [refresh, toast],
  );

  const value = useMemo<Ctx | null>(() => {
    if (!org || !orgId) return null;
    const path = { org_id: orgId };
    const items = checklistView(org.checklist);
    return {
      org,
      orgId,
      can: (p) => org.permissions.includes(p),
      items,
      remaining: remainingSteps(items),
      ready: canGoLive(items),
      run,
      refresh,
      showSecret: (label, v) => setSecret({ label, value: v }),
      saveBranding: (b) => run(() => unwrap(api.PUT("/api/v1/orgs/{org_id}/branding", { params: { path }, body: b })), "Branding saved"),
      resetBranding: async () => {
        const r = await run(() => unwrap(api.DELETE("/api/v1/orgs/{org_id}/branding", { params: { path } })), "Branding reset");
        if (r.ok) reset();
        return r;
      },
      setModules: (ids) => run(() => unwrap(api.PUT("/api/v1/orgs/{org_id}/modules", { params: { path }, body: { modules: ids } }))),
      toggleConnector: (id, on) =>
        run(() => unwrap(api.PUT("/api/v1/orgs/{org_id}/connectors/{connector}", { params: { path: { ...path, connector: id } }, body: { connected: on } })), on ? "Connected. Customers will see a consent screen first." : "Disconnected"),
      markSnippetCopied: () => {
        if (!org.permissions.includes("branding.edit") || org.checklist.find((c) => c.id === "snippet")?.done) return;
        void run(() => unwrap(api.POST("/api/v1/orgs/{org_id}/snippet-copied", { params: { path } })));
      },
      setEnvironment: async (env) => {
        let key: string | null = null;
        const r = await run(async () => {
          const res = await unwrap(api.PUT("/api/v1/orgs/{org_id}/environment", { params: { path }, body: { environment: env } }));
          key = res.secret_key ?? null;
        }, env === "live" ? "You are live. Live keys are now active." : "Back in the sandbox");
        if (r.ok && key) setSecret({ label: "Your live secret key", value: key });
        return r;
      },
    };
  }, [org, orgId, run, refresh, reset]);

  if (orgs.isLoading || (orgId && detail.isLoading)) return <p className="text-muted">Loading your workspace…</p>;
  if (orgs.isError || detail.isError) return <Alert tone="error">Could not load your workspace. Please refresh the page.</Alert>;
  if (!orgId || !value)
    return (
      <>
        {secret ? <SecretReveal secret={secret} onClose={() => setSecret(null)} /> : null}
        <CreateWorkspace
          onCreated={(id, key) => {
            try {
              localStorage.setItem(CHOSEN, id);
            } catch {
              /* private mode: the first workspace is chosen anyway */
            }
            setChosen(id);
            setSecret({ label: "Your sandbox secret key", value: key });
          }}
        />
      </>
    );

  const all = orgs.data ?? [];
  return (
    <WorkspaceCtx.Provider value={value}>
      {all.length > 1 ? (
        <div className="mb-4 flex items-center gap-2 text-sm">
          <label htmlFor="ws-switch" className="text-muted">
            Workspace
          </label>
          <select
            id="ws-switch"
            value={orgId}
            onChange={(e) => {
              setChosen(e.target.value);
              try {
                localStorage.setItem(CHOSEN, e.target.value);
              } catch {
                /* ignore */
              }
            }}
            className="min-h-[36px] rounded-lg border border-line bg-surface px-2"
          >
            {all.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {secret ? (
        <div className="mb-4">
          <SecretReveal secret={secret} onClose={() => setSecret(null)} />
        </div>
      ) : null}
      {children}
    </WorkspaceCtx.Provider>
  );
}

export function useWorkspace(): Ctx {
  const v = useContext(WorkspaceCtx);
  if (!v) throw new Error("useWorkspace must be used inside <WorkspaceProvider>");
  return v;
}
