import type { components } from "@/lib/api/schema";

export type Journey = components["schemas"]["JourneyOut"];
export type JourneyCard = components["schemas"]["CardOut"];
export type ChapterInfo = components["schemas"]["ChapterOut"];
export type AnswerResult = components["schemas"]["AnswerOut"];

export const pct = (share: string | number) => Math.round(Number(share) * 100);

export type NodeState = "done" | "current" | "open" | "locked";

/** How each chapter node is drawn on the map: the first unfinished unlocked chapter is "current". */
export function nodeStates(chapters: ChapterInfo[]): NodeState[] {
  const current = chapters.findIndex((c) => c.unlocked && !c.complete);
  return chapters.map((c, i) => (c.complete ? "done" : !c.unlocked ? "locked" : i === current ? "current" : "open"));
}

export function chapterAction(c: ChapterInfo): string {
  if (c.complete) return "Review";
  if (!c.unlocked) return "Locked";
  return c.done > 0 ? "Continue" : "Start";
}

/** "667 → 702 (+35)" when a previous score is known; otherwise just the score. Never a decimal. */
export function scoreDelta(previous: number | null, now: number): string {
  const n = Math.round(now);
  if (previous === null) return String(n);
  const p = Math.round(previous);
  const d = n - p;
  return d === 0 ? `${n} (no change)` : `${p} → ${n} (${d > 0 ? "+" : ""}${d})`;
}

/** Chips submit the card at once (auto-advance) unless the card also needs the "how is it invested" choice. */
export function chipSubmitsAtOnce(card: Pick<JourneyCard, "kind">, chipValue: string): boolean {
  return card.kind !== "savings_mix" || chipValue === "0";
}

export const BADGE_ICON: Record<string, string> = {
  first_score: "◎",
  protected: "⛨",
  tax_smart: "₹",
  fine_tuned: "✎",
  full_picture: "★",
  steady_4: "◷",
};
