"use client";

import { Badge, Card } from "@/design-system/ui";
import { useAuth } from "@/features/auth/auth-context";

export default function Home() {
  const { user } = useAuth();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Welcome{user?.full_name ? `, ${user.full_name}` : ""}</h1>
      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Your FinScore</h2>
          <Badge tone="demo">Not available yet</Badge>
        </div>
        <p className="text-muted">
          The AI interview and your FinScore arrive in the next build phase. No score is shown until the official scoring rules are approved — we will
          never show an unofficial number as your FinScore.
        </p>
      </Card>
      <Card>
        <h2 className="mb-1 text-lg font-semibold">Account</h2>
        <p className="text-sm text-muted">Signed in as {user?.email}</p>
      </Card>
    </div>
  );
}
