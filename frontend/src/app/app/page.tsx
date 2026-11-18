"use client";

import { useEffect } from "react";

import { useAuth } from "@/features/auth/auth-context";
import { JourneyHomeCard } from "@/features/journey/home-card";
import { MatrixScoreCard } from "@/features/matrix-score/home-card";
import { track } from "@/lib/analytics";

/**
 * Home answers "where do I stand and what next": the FinScore (one score, the same everywhere) and the next Money Map step.
 * The Today and next-action cards are hidden until they run on this score (they still use the earlier 20-pillar rules).
 */
export default function Home() {
  const { user } = useAuth();
  useEffect(() => track("home_view"), []);
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold tracking-tight">Welcome{user?.full_name ? `, ${user.full_name}` : ""}</h1>
      <MatrixScoreCard />
      <JourneyHomeCard />
    </div>
  );
}
