import type { MatrixFactor, MatrixScore } from "./logic";

export const factor = (over: Partial<MatrixFactor> & Pick<MatrixFactor, "id" | "name">): MatrixFactor => ({
  weight: "10",
  status: "scored",
  max_points: "90.00",
  value: "25.0000",
  band: "Less than 30%",
  factor_score: 4,
  points: "36.00",
  missing_inputs: [],
  reason: "Cashflow: cashflow 25.0% of income falls in 'Less than 30%' for age band 26-30 -> 4/10",
  ...over,
});

export const score = (over: Partial<MatrixScore> = {}): MatrixScore => ({
  overall: "560.45",
  score_range: [0, 900],
  confidence: "0.4400",
  early_estimate: true,
  message: null,
  official: false,
  rule_set: "WORKBOOK DRAFT - NOT OFFICIAL",
  rule_version: "matrix-0.1.0-draft",
  engine_version: "0.1.0",
  input_digest: "abcdef0123456789",
  computed_at: "2026-11-16T10:00:00Z",
  factors: [
    factor({ id: "F01", name: "Cashflow" }),
    factor({ id: "F02", name: "Savings", points: "48.60", max_points: "81.00", factor_score: 6, band: "20-30%" }),
    factor({ id: "F03", name: "Assets", status: "missing", points: null, factor_score: null, band: null, value: null, missing_inputs: ["equity_holdings", "other_assets"] }),
    factor({ id: "F15", name: "Kids goal planning", status: "not_applicable", points: null, factor_score: null, band: null, value: null }),
  ],
  missing_inputs: ["equity_holdings", "other_assets", "life_cover_amount"],
  assumptions: ["Risk profile Balanced assumed for the retirement calculation (not provided)"],
  notes: [],
  watermark: "WORKBOOK DRAFT RULES — NOT AN OFFICIAL FINSCORE",
  ...over,
});
