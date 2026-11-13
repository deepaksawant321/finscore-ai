"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { FormEvent } from "react";

import { Alert, Badge, Button, Card, Input } from "@/design-system/ui";
import { useAuth } from "@/features/auth/auth-context";
import { PrivacyCards, SupportCard } from "@/features/privacy/privacy-cards";
import { api, problemMessage } from "@/lib/api/client";

function ProfileForm() {
  const { user, reload } = useAuth();
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const { response, error } = await api.PATCH("/api/v1/users/me", { body: { full_name: String(f.get("full_name")) } });
    if (response.ok) {
      await reload();
      setMsg({ tone: "success", text: "Profile saved." });
    } else setMsg({ tone: "error", text: problemMessage(error) });
  }
  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold">Profile</h2>
      <form onSubmit={onSubmit} className="max-w-sm space-y-4">
        {msg ? <Alert tone={msg.tone}>{msg.text}</Alert> : null}
        <Input label="Email" value={user?.email ?? ""} readOnly disabled />
        <Input name="full_name" label="Name" defaultValue={user?.full_name ?? ""} maxLength={120} />
        <Button type="submit">Save</Button>
      </form>
    </Card>
  );
}

function Sessions() {
  const qc = useQueryClient();
  const sessions = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const { data, error } = await api.GET("/api/v1/users/me/sessions");
      if (!data) throw new Error(problemMessage(error));
      return data;
    },
  });
  const revoke = useMutation({
    mutationFn: (id: string) => api.DELETE("/api/v1/users/me/sessions/{session_id}", { params: { path: { session_id: id } } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions"] }),
  });
  return (
    <Card>
      <h2 className="mb-1 text-lg font-semibold">Active sessions</h2>
      <p className="mb-4 text-sm text-muted">Devices currently signed in to your account.</p>
      {sessions.isLoading && <p className="text-muted">Loading…</p>}
      {sessions.isError && <Alert tone="error">Could not load sessions.</Alert>}
      <ul className="divide-y divide-line">
        {sessions.data?.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
            <div>
              <p className="font-medium">
                {s.user_agent?.slice(0, 60) ?? "Unknown device"} {s.current ? <Badge tone="positive">This device</Badge> : null}
              </p>
              <p className="text-muted">
                {s.ip ?? "unknown IP"} · since {new Date(s.created_at).toLocaleString("en-IN")}
              </p>
            </div>
            {!s.current && (
              <Button variant="secondary" onClick={() => revoke.mutate(s.id)} loading={revoke.isPending}>
                Sign out
              </Button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <ProfileForm />
      <Sessions />
      <SupportCard />
      <PrivacyCards />
    </div>
  );
}
