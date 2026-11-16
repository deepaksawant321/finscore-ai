import type { components } from "@/lib/api/schema";

export type MatrixScore = components["schemas"]["MatrixScoreOut"];
export type MatrixFactor = components["schemas"]["MatrixFactorOut"];

/** Plain-language names for the profile fields the backend reports as missing (catalogue keys). Display only. */
export const FIELD_LABELS: Record<string, string> = {
  age: "your age",
  annual_income: "your yearly income",
  monthly_expenses: "your monthly expenses",
  monthly_emi_total: "your monthly loan EMIs",
  monthly_investment: "what you invest each month",
  dependants: "how many people depend on you",
  retirement_age: "the age you want to retire",
  loans_outstanding: "the total you owe on loans",
  equity_holdings: "your stocks and equity funds",
  debt_holdings: "your bonds, PPF/EPF and debt funds",
  other_assets: "your other assets (gold, property)",
  pending_goals: "how many goals you are working towards",
  life_cover_amount: "your life insurance cover",
  health_cover_amount: "your health insurance cover",
  kids: "how many children you have",
  kids_goal_planned: "whether you save for your children",
  section_80c: "your yearly 80C investments",
  section_80d: "your yearly 80D premiums",
  life_expectancy: "the age your money should last until",
  risk_profile: "your comfort with investment risk",
};

export function fieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key.replace(/_/g, " ");
}

/** Share of a factor's available points that was earned (0..1). Not a verdict: the business has not defined good/bad thresholds. */
export function pointsShare(f: MatrixFactor): number {
  const max = Number(f.max_points);
  if (!f.points || !(max > 0)) return 0;
  return Math.max(0, Math.min(1, Number(f.points) / max));
}

/** Points still available in a scored factor. */
export function pointsAvailable(f: MatrixFactor): number {
  return f.points == null ? 0 : Math.max(0, Number(f.max_points) - Number(f.points));
}

/** The scored factors with the most points still available, largest first (ties keep the factor order). */
export function biggestGaps(factors: MatrixFactor[], n = 3): MatrixFactor[] {
  return factors
    .map((f, i) => ({ f, i, gap: f.status === "scored" ? pointsAvailable(f) : 0 }))
    .filter((x) => x.gap > 0.005)
    .sort((a, b) => b.gap - a.gap || a.i - b.i)
    .slice(0, n)
    .map((x) => x.f);
}

export function groupFactors(factors: MatrixFactor[]) {
  return {
    scored: factors.filter((f) => f.status === "scored"),
    missing: factors.filter((f) => f.status === "missing"),
    notApplicable: factors.filter((f) => f.status === "not_applicable"),
  };
}

export const confidencePct = (s: Pick<MatrixScore, "confidence">): number => Math.round(Number(s.confidence) * 100);

/** Missing profile fields in the order the interview asks about them (the backend sends them alphabetically). Unknown keys go last. */
export function orderedMissing(keys: string[]): string[] {
  const order = Object.keys(FIELD_LABELS);
  const rank = (k: string) => (order.includes(k) ? order.indexOf(k) : order.length);
  return [...keys].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

/** Assumptions and engine notes worth showing. The generic "some factors are missing" note is dropped: confidence already says it. */
export function visibleAssumptions(s: Pick<MatrixScore, "assumptions" | "notes">): string[] {
  return [...s.assumptions, ...s.notes.filter((n) => !n.startsWith("Some factors are missing"))];
}
