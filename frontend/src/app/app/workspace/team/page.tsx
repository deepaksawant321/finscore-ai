"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { Alert, Badge, Button, Card, Icon, useToast } from "@/design-system/ui";
import { api } from "@/lib/api/client";
import { unwrap, unwrapEmpty, useActivity, useMembers } from "@/features/workspace/api";
import type { Role } from "@/features/workspace/api";
import { ASSIGNABLE_ROLES, PERMISSIONS, ROLE_LABEL, ROLE_ORDER } from "@/features/workspace/catalogue";
import { activityText } from "@/features/workspace/logic";
import { PageHead } from "@/features/workspace/page-head";
import { useWorkspace } from "@/features/workspace/workspace-store";

const select = "min-h-[36px] rounded-lg border border-line bg-surface px-2 text-sm";

export default function TeamPage() {
  const ws = useWorkspace();
  const toast = useToast();
  const members = useMembers(ws.orgId);
  const activity = useActivity(ws.orgId);
  const canManage = ws.can("members.manage");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof ASSIGNABLE_ROLES)[number]>("analyst");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { seats_used, seats_limit } = ws.org.usage;
  const base = { org_id: ws.orgId };

  async function invite(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await ws.run(() => unwrap(api.POST("/api/v1/orgs/{org_id}/members", { params: { path: base }, body: { email, role } })), `Invite sent to ${email.trim()}`);
    setBusy(false);
    if (r.ok) setEmail("");
    else setError(r.reason);
  }

  return (
    <div className="space-y-6">
      <PageHead
        title="Team & roles"
        description="Give each person the access they need. Every change is logged."
        actions={
          <Badge tone="brand">
            {seats_used}
            {seats_limit == null ? "" : ` of ${seats_limit}`} {seats_limit == null && seats_used === 1 ? "seat" : "seats"}
          </Badge>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card className="min-w-0 space-y-4">
          <h2 className="font-display text-lg font-semibold">People</h2>
          {members.isLoading ? <p className="text-sm text-muted">Loading…</p> : null}
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.08em] text-muted">
                  <th className="py-2 pr-3 font-semibold">Person</th>
                  <th className="px-3 py-2 font-semibold">Role</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Last active</th>
                  <th className="py-2 pl-3">
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {members.data?.map((m) => (
                  <tr key={m.id}>
                    <td className="py-3 pr-3">
                      <p className="font-semibold">{m.is_you ? "You" : m.email}</p>
                      {m.is_you ? <p className="text-xs text-muted">{m.email}</p> : null}
                    </td>
                    <td className="px-3">
                      {m.role === "owner" || !canManage ? (
                        <Badge tone={m.role === "owner" ? "ai" : "neutral"}>{ROLE_LABEL[m.role]}</Badge>
                      ) : (
                        <select
                          aria-label={`Role for ${m.email}`}
                          className={select}
                          value={m.role}
                          onChange={(e) =>
                            void ws.run(
                              () => unwrap(api.PATCH("/api/v1/orgs/{org_id}/members/{member_id}", { params: { path: { ...base, member_id: m.id } }, body: { role: e.target.value as Exclude<Role, "owner"> } })),
                              `${m.email} is now ${ROLE_LABEL[e.target.value as Role]}`,
                            )
                          }
                        >
                          {ASSIGNABLE_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABEL[r]}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-3">
                      <Badge tone={m.status === "active" ? "positive" : "warn"}>{m.status === "active" ? "Active" : "Invited"}</Badge>
                    </td>
                    <td className="px-3 text-muted">{m.last_active_at ? new Date(m.last_active_at).toLocaleDateString("en-IN") : "Not yet"}</td>
                    <td className="pl-3 text-right">
                      {canManage && m.role !== "owner" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Remove ${m.email}`}
                          onClick={() => void ws.run(() => unwrapEmpty(api.DELETE("/api/v1/orgs/{org_id}/members/{member_id}", { params: { path: { ...base, member_id: m.id } } })), `${m.email} removed`)}
                        >
                          <Icon name="x" size={14} />
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {canManage ? (
            <form onSubmit={invite} className="flex flex-wrap items-end gap-3 border-t border-line pt-4">
              <div className="min-w-[14rem] flex-1 space-y-1.5">
                <label htmlFor="invite-email" className="text-sm font-medium">
                  Invite by email
                </label>
                <input id="invite-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" className="min-h-[44px] w-full rounded-lg border border-line bg-surface px-3.5 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="invite-role" className="text-sm font-medium">
                  Role
                </label>
                <select id="invite-role" value={role} onChange={(e) => setRole(e.target.value as typeof role)} className="min-h-[44px] rounded-lg border border-line bg-surface px-3 text-sm">
                  {ASSIGNABLE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" loading={busy}>
                Send invite
              </Button>
            </form>
          ) : (
            <Alert tone="info">Your role ({ROLE_LABEL[ws.org.my_role]}) can see the team but not change it.</Alert>
          )}
          {error ? <Alert tone="error">{error}</Alert> : null}
        </Card>

        <div className="min-w-0 space-y-6">
          <Card className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold">Single sign-on</h2>
              <Badge tone="ai">Enterprise</Badge>
            </div>
            <p className="text-sm text-muted">Sign in with Okta, Azure AD or Google Workspace. Enforce MFA and remove leavers automatically.</p>
            <Button
              variant="secondary"
              disabled={!ws.can("billing.manage")}
              onClick={() => void ws.run(() => unwrap(api.POST("/api/v1/orgs/{org_id}/billing/contact-sales", { params: { path: base } })), "Thanks. Our team will reach out within one business day.")}
            >
              Talk to us about Enterprise
            </Button>
          </Card>
          <Card className="space-y-3">
            <h2 className="font-display text-lg font-semibold">Recent activity</h2>
            {activity.data?.length === 0 ? <p className="text-sm text-muted">Nothing yet.</p> : null}
            <ul className="space-y-3">
              {activity.data?.map((a, i) => (
                <li key={`${a.at}-${i}`} className="flex items-start gap-3">
                  <i className="mt-2 h-2 w-2 shrink-0 rounded-full bg-positive" />
                  <div>
                    <p className="text-sm">{activityText(a)}</p>
                    <p className="text-xs text-muted">{new Date(a.at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <Card className="space-y-3">
        <h2 className="font-display text-lg font-semibold">What each role can do</h2>
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[30rem] text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-[0.08em] text-muted">
                <th className="py-2 pr-3 font-semibold">Permission</th>
                {ROLE_ORDER.map((r) => (
                  <th key={r} className="px-3 py-2 font-semibold">
                    {ROLE_LABEL[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {PERMISSIONS.map(([name, ...allowed]) => (
                <tr key={name}>
                  <td className="py-3 pr-3">{name}</td>
                  {allowed.map((ok, i) => (
                    <td key={ROLE_ORDER[i]} className="px-3">
                      {ok ? (
                        <span className="text-positive">
                          <Icon name="check" size={16} />
                          <span className="sr-only">Allowed</span>
                        </span>
                      ) : (
                        <span className="text-muted">
                          <span aria-hidden="true">–</span>
                          <span className="sr-only">Not allowed</span>
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
