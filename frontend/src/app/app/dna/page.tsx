"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { Alert, Badge, Card } from "@/design-system/ui";
import { api } from "@/lib/api/client";

export default function DnaPage() {
  const dna = useQuery({
    queryKey: ["dna"],
    queryFn: async () => {
      const { data, response } = await api.GET("/api/v1/dna");
      if (response.status === 404) return null;
      if (!data) throw new Error("dna failed");
      return data;
    },
  });
  if (dna.isLoading) return <p className="text-muted">Loading…</p>;
  const d = dna.data;
  if (!d)
    return (
      <Card>
        <p>
          Your Financial DNA appears once I know a little about you.{" "}
          <Link href="/app/interview" className="text-ai underline">
            Start the conversation
          </Link>
        </p>
      </Card>
    );
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold tracking-tight">Your Financial DNA</h1>
      {d.watermark && <Alert tone="info">{d.watermark}. Trait rules and personas below are placeholders.</Alert>}
      {d.persona ? (
        <Card className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">Your wealth persona</p>
          <h2 className="text-2xl font-bold text-brand">{d.persona.name}</h2>
          <p className="text-muted">{d.persona.description}</p>
        </Card>
      ) : (
        <Card>
          <p className="text-muted">I don&apos;t have enough evidence to suggest a persona yet — I will not guess.</p>
        </Card>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {d.traits.map((t) => (
          <Card key={t.key} className="space-y-2">
            <p className="text-sm text-muted">{t.label}</p>
            <p className="text-xl font-semibold">{t.value}</p>
            <p className="text-sm text-muted">{t.wording}. This can change as your behaviour changes.</p>
            <div className="flex gap-2">
              <Badge>Confidence {Math.round(Number(t.confidence) * 100)}%</Badge>
              <Badge>{t.evidence_count} evidence</Badge>
            </div>
          </Card>
        ))}
      </div>
      {d.traits.length === 0 && <Card className="text-muted">No traits yet — they need evidence from what you tell me.</Card>}
    </div>
  );
}
