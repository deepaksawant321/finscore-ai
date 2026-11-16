"use client";

import { useState } from "react";

import { copyToClipboard } from "@/design-system/clipboard";
import { Alert, Badge, Button, Card, CodeBlock, Icon, SegmentedTabs, useToast } from "@/design-system/ui";
import { api } from "@/lib/api/client";
import { unwrap, unwrapEmpty, useApiKeys } from "@/features/workspace/api";
import type { ApiKey } from "@/features/workspace/api";
import { CONNECTORS } from "@/features/workspace/catalogue";
import { enabledModules, slugify, snippet } from "@/features/workspace/logic";
import type { SnippetKind } from "@/features/workspace/logic";
import { PageHead } from "@/features/workspace/page-head";
import { BrowserFrame, WidgetPreview } from "@/features/workspace/widget-preview";
import { useWorkspace } from "@/features/workspace/workspace-store";
import { useWorkspaceTheme } from "@/lib/theme/theme-provider";

const when = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Never");

function KeyRow({ k, canManage, onRevoke }: { k: ApiKey; canManage: boolean; onRevoke: (id: string) => void }) {
  const toast = useToast();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold">
          {k.kind === "publishable" ? "Publishable key" : "Secret key"} <Badge tone={k.environment === "live" ? "positive" : "warn"}>{k.environment === "live" ? "Live" : "Sandbox"}</Badge>
          {k.expires_at ? <Badge className="ml-1">Expires {when(k.expires_at)}</Badge> : null}
        </p>
        <p className="break-all font-mono text-xs text-muted">{k.display}</p>
        <p className="text-xs text-muted">Last used: {when(k.last_used_at)}</p>
      </div>
      <div className="flex gap-2">
        {k.kind === "publishable" ? (
          <Button size="sm" variant="secondary" onClick={async () => toast((await copyToClipboard(k.display)) ? "Key copied" : "Select the key and copy it")}>
            <Icon name="copy" size={14} /> Copy
          </Button>
        ) : null}
        {canManage ? (
          <Button size="sm" variant="ghost" aria-label={`Revoke ${k.kind} ${k.environment} key ending ${k.display.slice(-4)}`} onClick={() => onRevoke(k.id)}>
            Revoke
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  const ws = useWorkspace();
  const { org } = ws;
  const { theme } = useWorkspaceTheme();
  const canKeys = ws.can("keys.manage");
  const canEdit = ws.can("branding.edit");
  const keys = useApiKeys(ws.orgId, canKeys);
  const [kind, setKind] = useState<SnippetKind>("embed");
  const publishable = keys.data?.find((k) => k.kind === "publishable" && k.environment === (org.environment === "live" ? "live" : "test"))?.display;
  const code = snippet(kind, {
    slug: org.slug || slugify(theme.name),
    modules: enabledModules(org.modules),
    publishableKey: publishable,
    apiBase: typeof window === "undefined" ? undefined : window.location.origin,
    cdn: process.env.NEXT_PUBLIC_WIDGET_CDN,
  });
  const path = { org_id: ws.orgId };

  async function rotate(env: "test" | "live") {
    let value = "";
    const r = await ws.run(async () => {
      value = (await unwrap(api.POST("/api/v1/orgs/{org_id}/api-keys/rotate", { params: { path }, body: { environment: env } }))).secret_key;
    }, "New secret key issued. The old key works for 24 more hours.");
    if (r.ok) ws.showSecret(`Your new ${env === "live" ? "live" : "sandbox"} secret key`, value);
  }

  return (
    <div className="space-y-6">
      <PageHead title="Integrations" description="Pick how you plug FinScore into your product. The preview on the right is what your customers will see." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <Card className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-lg font-semibold">Add it to your product</h2>
              <SegmentedTabs<SnippetKind>
                ariaLabel="Integration method"
                idPrefix="snip"
                value={kind}
                onChange={setKind}
                items={[
                  { id: "embed", label: "Embed widget" },
                  { id: "api", label: "REST API" },
                  { id: "sdk", label: "React SDK" },
                ]}
              />
            </div>
            {kind === "api" ? (
              <Alert tone="success">The REST API works today. Use a secret key from this page.</Alert>
            ) : (
              <Alert tone="info">The hosted widget script and the React SDK are not published yet, so this sample will not load. The REST API works today.</Alert>
            )}
            <CodeBlock code={code} label={`${kind} sample`} onAttempt={() => kind === "embed" && ws.markSnippetCopied()} />
            <p className="text-sm text-muted">Customers are identified with a signed token from your backend, so no personal data touches the browser.</p>
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold">Data sources</h2>
              <Badge>Consent-led</Badge>
            </div>
            <ul className="space-y-3">
              {CONNECTORS.map((c) => {
                const on = org.connectors[c.id] === true;
                return (
                  <li key={c.id} className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3.5">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-[10px] ${on ? "bg-positive/15 text-positive" : "bg-brand-soft text-brand-strong"}`}>
                      <Icon name={c.icon} size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{c.name}</p>
                      <p className="text-xs text-muted">{c.description}</p>
                    </div>
                    <Button size="sm" variant={on ? "secondary" : "primary"} aria-pressed={on} disabled={!canEdit} onClick={() => void ws.toggleConnector(c.id, !on)}>
                      {on ? "Connected" : "Connect"}
                    </Button>
                  </li>
                );
              })}
            </ul>
            <p className="text-xs text-muted">This records which sources you plan to use. Live data connections are not available yet.</p>
          </Card>

          <Card className="space-y-1">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold">API keys</h2>
              {canKeys ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => void rotate("test")}>
                    Rotate sandbox secret
                  </Button>
                  {org.went_live_at ? (
                    <Button size="sm" variant="secondary" onClick={() => void rotate("live")}>
                      Rotate live secret
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
            {!canKeys ? <Alert tone="info">Your role ({org.my_role}) cannot see or manage API keys.</Alert> : null}
            {keys.isLoading ? <p className="text-sm text-muted">Loading keys…</p> : null}
            {keys.data?.map((k) => (
              <KeyRow key={k.id} k={k} canManage={canKeys} onRevoke={(id) => void ws.run(() => unwrapEmpty(api.DELETE("/api/v1/orgs/{org_id}/api-keys/{key_id}", { params: { path: { ...path, key_id: id } } })), "Key revoked")} />
            ))}
            {canKeys && !org.went_live_at ? (
              <div className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-semibold">Live keys</p>
                  <p className="text-sm text-muted">Created when you go live</p>
                </div>
                <Badge>
                  <Icon name="lock" size={12} /> Locked
                </Badge>
              </div>
            ) : null}
            <p className="pt-2 text-xs text-muted">Secret keys are shown once, when they are created. Only a fingerprint is kept, so a lost key must be rotated.</p>
          </Card>
        </div>

        <div className="min-w-0 space-y-3 lg:sticky lg:top-4 lg:self-start">
          <BrowserFrame>
            <WidgetPreview />
          </BrowserFrame>
          <p className="text-center text-sm text-muted">Live preview. Turn modules on or off in Go-live setup and change colours in Branding.</p>
        </div>
      </div>
    </div>
  );
}
