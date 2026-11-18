"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { Card, buttonClass } from "@/design-system/ui";
import { api } from "@/lib/api/client";

import { pct } from "./logic";

export function useJourney() {
  return useQuery({
    queryKey: ["journey"],
    queryFn: async () => {
      const { data } = await api.GET("/api/v1/journey");
      if (!data) throw new Error("journey failed");
      return data;
    },
  });
}

/** Home and score-page entry: start the map, or continue it, with how much of the score is measured so far. */
export function JourneyHomeCard() {
  const j = useJourney().data;
  if (!j) return null;
  const snapshot = j.chapters[0];
  const next = j.chapters.find((c) => c.unlocked && !c.complete);
  const measured = pct(j.measured);

  if (snapshot && !snapshot.complete)
    return (
      <Card className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Get your FinScore in about a minute</h2>
        <p className="text-muted">
          A handful of quick taps on your Money Map and your score appears.
          {snapshot.done > 0 ? ` You are ${snapshot.done} of ${snapshot.total} in.` : ""}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/app/journey" className={buttonClass("primary", "md", "w-fit")}>
            {snapshot.done > 0 ? "Continue" : "Start my Money Map"}
          </Link>
          <Link href="/app/interview" className="text-sm text-ai underline">
            Prefer to talk it through?
          </Link>
        </div>
      </Card>
    );
  if (!next) return null; // everything answered
  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">Continue your Money Map</h2>
        {j.progress && <span className="text-sm text-muted">✦ {j.progress.points} clarity points</span>}
      </div>
      <div className="h-2 rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={measured}>
        <div className="h-2 rounded-full bg-ai-gradient" style={{ width: `${measured}%` }} />
      </div>
      <p className="text-sm text-muted">
        {measured >= 100 ? "Your score is fully measured. " : `${measured}% of your score measured. `}
        Next: <strong>{next.title}</strong>, {next.blurb.toLowerCase()}
        {measured >= 100 ? " It fills in your Health page and plans." : ""}
      </p>
      <Link href="/app/journey" className={buttonClass("primary", "md", "w-fit")}>
        Continue
      </Link>
    </Card>
  );
}
