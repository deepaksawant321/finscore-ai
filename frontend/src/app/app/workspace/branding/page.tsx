"use client";

import { useEffect, useState } from "react";

import { Alert, Badge, Button, Card, Icon, SegmentedTabs, Switch, useToast } from "@/design-system/ui";
import { brandingFromTheme, sameBranding } from "@/features/workspace/logic";
import { PageHead } from "@/features/workspace/page-head";
import { BrowserFrame, WidgetPreview } from "@/features/workspace/widget-preview";
import { useWorkspace } from "@/features/workspace/workspace-store";
import { DEFAULT_THEME, FONT_CHOICES, brandWarning, isDefaultTheme, isHex } from "@/lib/theme/tenant-theme";
import type { FontChoice } from "@/lib/theme/tenant-theme";
import { useWorkspaceTheme } from "@/lib/theme/theme-provider";

const BRAND_SWATCHES = ["#0FB5A6", "#2563EB", "#7C3AED", "#E11D48", "#F59E0B", "#16A34A", "#0B1B2B"];
const ACCENT_SWATCHES = ["#4F46E5", "#0EA5E9", "#DB2777", "#F97316", "#14B8A6", "#8B5CF6"];

function Swatches({ label, value, options, onPick }: { label: string; value: string; options: string[]; onPick: (hex: string) => void }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2">
      {options.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onPick(c)}
          aria-label={`${label} ${c}`}
          aria-pressed={c.toLowerCase() === value.toLowerCase()}
          style={{ background: c }}
          className="h-9 w-9 rounded-full border-[3px] border-surface shadow-[0_0_0_1px_rgb(var(--line))] transition hover:scale-110 aria-pressed:shadow-[0_0_0_2px_rgb(var(--ink))]"
        />
      ))}
      <label className="relative h-9 w-9 cursor-pointer overflow-hidden rounded-full border-[3px] border-surface shadow-[0_0_0_1px_rgb(var(--line))] [background:conic-gradient(red,yellow,lime,aqua,blue,magenta,red)] focus-within:ring-2 focus-within:ring-ai">
        <span className="sr-only">Custom {label.toLowerCase()}</span>
        <input type="color" value={isHex(value) ? value : DEFAULT_THEME.brand} onChange={(e) => onPick(e.target.value.toUpperCase())} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
      </label>
    </div>
  );
}

export default function BrandingPage() {
  const { theme, setTheme } = useWorkspaceTheme();
  const ws = useWorkspace();
  const toast = useToast();
  const [name, setName] = useState(theme.name);
  useEffect(() => setName(theme.name), [theme.name]);
  const warning = brandWarning(theme.brand);
  const canEdit = ws.can("branding.edit");
  const draft = brandingFromTheme(theme);
  const saved = ws.org.branding ? sameBranding(draft, ws.org.branding) : isDefaultTheme(theme); // nothing saved and nothing changed = in sync

  return (
    <div className="space-y-6">
      <PageHead
        title="Branding"
        description="Make it look like your product. Every screen, button and chart picks up your colours as you change them."
        actions={
          <>
            <Button variant="secondary" disabled={!canEdit || !ws.org.branding} onClick={() => void ws.resetBranding()}>
              Reset to defaults
            </Button>
            <Button disabled={!canEdit || (saved && !!ws.org.branding)} onClick={() => void ws.saveBranding(draft)}>
              {saved && ws.org.branding ? "Saved" : "Save branding"}
            </Button>
          </>
        }
      />
      {!canEdit ? <Alert tone="info">You can preview changes here, but your role ({ws.org.my_role}) cannot save them.</Alert> : null}
      {canEdit && !saved ? <Alert tone="info">You have unsaved changes. Press Save so your workspace and checklist use them.</Alert> : null}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Card className="min-w-0 space-y-6">
          <div className="space-y-1.5">
            <label htmlFor="brand-name" className="text-sm font-medium">
              Workspace name
            </label>
            <input
              id="brand-name"
              value={name}
              maxLength={28}
              onChange={(e) => {
                setName(e.target.value);
                if (e.target.value.trim()) setTheme({ name: e.target.value });
              }}
              className="min-h-[44px] w-full rounded-lg border border-line bg-surface px-3.5 text-sm"
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Primary colour</p>
            <Swatches label="Primary colour" value={theme.brand} options={BRAND_SWATCHES} onPick={(hex) => setTheme({ brand: hex })} />
            {warning ? <Alert tone="info">{warning}</Alert> : null}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Accent for AI features</p>
            <Swatches label="Accent colour" value={theme.accent} options={ACCENT_SWATCHES} onPick={(hex) => setTheme({ accent: hex })} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="brand-radius" className="text-sm font-medium">
                Corner roundness
              </label>
              <b className="text-sm tabular-nums">{theme.radius}px</b>
            </div>
            <input id="brand-radius" type="range" min={8} max={32} step={2} value={theme.radius} onChange={(e) => setTheme({ radius: Number(e.target.value) })} className="w-full" />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Typeface</p>
            <SegmentedTabs<FontChoice> ariaLabel="Typeface" idPrefix="font" value={theme.font} onChange={(f) => setTheme({ font: f })} items={FONT_CHOICES.map((f) => ({ id: f.id, label: f.label }))} />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">Show “Powered by 5nance”</p>
              <p className="text-xs text-muted">Removing it needs the Enterprise plan</p>
            </div>
            <Switch
              checked={theme.poweredBy}
              label="Show powered by label"
              onChange={(on) => {
                if (!on && !ws.org.entitlements.can_remove_powered_by) return toast("Removing the label needs the Enterprise plan");
                setTheme({ poweredBy: on });
              }}
            />
          </div>

          <div className="flex items-start gap-3 rounded-lg bg-surface-2 p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-ai-soft text-ai">
              <Icon name="lock" size={18} />
            </span>
            <div>
              <p className="text-sm font-semibold">Custom domain and email sender</p>
              <p className="text-sm text-muted">
                Serve FinScore from <span className="font-mono">score.yourbank.com</span>. Available on Enterprise.
              </p>
            </div>
          </div>
        </Card>

        <div className="min-w-0 space-y-4 lg:sticky lg:top-4 lg:self-start">
          <BrowserFrame>
            <WidgetPreview />
          </BrowserFrame>
          <Card variant="flat" className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-muted">Buttons and states</p>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm">Primary</Button>
              <Button size="sm" variant="ai">
                AI action
              </Button>
              <Button size="sm" variant="secondary">
                Secondary
              </Button>
              <Badge tone="brand">Badge</Badge>
              <Badge tone="ai">AI</Badge>
            </div>
          </Card>
          <p className="text-center text-sm text-muted">The whole workspace updates too. Try the sidebar. Press Save to keep it for everyone on your team.</p>
        </div>
      </div>
    </div>
  );
}
