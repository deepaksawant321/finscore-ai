import type { components } from "@/lib/api/schema";

export type QuickScoreIn = components["schemas"]["QuickScoreIn"];
export type ImproveItem = components["schemas"]["ImproveOut"];
export type Mix = QuickScoreIn["mix"];

/** Form state. Money fields are what the user typed or tapped ("1.5L", "50000"); null/"" = not answered yet. */
export type QuickForm = {
  age: number | null;
  income: string;
  expenses: string;
  emi: string;
  loans: string;
  sip: string;
  savings: string;
  mix: Mix | null;
  other: string;
  dependants: number | null;
  kids: number | null;
  kidsPlanned: boolean | null;
  health: string;
  life: string;
  goals: number | null;
};

export const EMPTY_FORM: QuickForm = {
  age: null, income: "", expenses: "", emi: "", loans: "", sip: "", savings: "", mix: null, other: "",
  dependants: null, kids: null, kidsPlanned: null, health: "", life: "", goals: null,
}; // prettier-ignore

const UNITS: Record<string, number> = { k: 1e3, thousand: 1e3, l: 1e5, lac: 1e5, lacs: 1e5, lakh: 1e5, lakhs: 1e5, cr: 1e7, crore: 1e7, crores: 1e7 };

/** "1,50,000" | "1.5L" | "1.5 lakh" | "50k" | "2 cr" | "₹ 40000" -> rupees. Returns null for anything else (never guesses). */
export function parseMoney(input: string): number | null {
  const s = input.trim().toLowerCase().replace(/[₹,\s]|rs\.?/g, "");
  if (s === "") return null;
  const m = /^(\d+(?:\.\d+)?)([a-z]*)$/.exec(s);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2] ?? "";
  if (unit === "") return n;
  const mult = UNITS[unit];
  return mult ? Math.round(n * mult * 100) / 100 : null;
}

const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const showInr = (n: number) => fmt.format(n);

/** Each question, in screen order, with whether it is answered. Loans and the kids question only exist when they apply. */
export function questions(f: QuickForm): { key: keyof QuickForm; label: string; done: boolean }[] {
  const money = (v: string) => parseMoney(v) !== null;
  const emi = parseMoney(f.emi);
  const list: { key: keyof QuickForm; label: string; done: boolean }[] = [
    { key: "age", label: "Your age", done: f.age !== null && f.age >= 18 && f.age <= 100 },
    { key: "income", label: "Monthly income", done: (parseMoney(f.income) ?? 0) > 0 },
    { key: "expenses", label: "Monthly spending", done: money(f.expenses) },
    { key: "emi", label: "Loan EMIs", done: money(f.emi) },
  ];
  if (emi !== null && emi > 0) list.push({ key: "loans", label: "Loans still owed", done: money(f.loans) });
  list.push(
    { key: "sip", label: "Monthly investing", done: money(f.sip) },
    { key: "savings", label: "Savings & investments", done: money(f.savings) },
    { key: "mix", label: "How it is invested", done: f.mix !== null || parseMoney(f.savings) === 0 },
    { key: "other", label: "Gold & other property", done: money(f.other) },
    { key: "dependants", label: "People who depend on you", done: f.dependants !== null },
    { key: "kids", label: "Children", done: f.kids !== null },
  );
  if ((f.kids ?? 0) > 0) list.push({ key: "kidsPlanned", label: "Saving for children", done: f.kidsPlanned !== null });
  list.push(
    { key: "health", label: "Health cover", done: money(f.health) },
    { key: "life", label: "Life cover", done: money(f.life) },
    { key: "goals", label: "Goals", done: f.goals !== null },
  );
  return list;
}

export const remaining = (f: QuickForm) => questions(f).filter((q) => !q.done);

/** The API body. Call only when `remaining(f)` is empty. */
export function toRequest(f: QuickForm): QuickScoreIn {
  const m = (v: string) => parseMoney(v) ?? 0;
  const emi = m(f.emi);
  const kids = f.kids ?? 0;
  return {
    age: f.age ?? 0,
    monthly_income: m(f.income),
    monthly_expenses: m(f.expenses),
    monthly_emi: emi,
    loans_outstanding: emi > 0 ? m(f.loans) : null,
    monthly_investment: m(f.sip),
    savings_total: m(f.savings),
    mix: f.mix ?? "balanced", // only defaulted when savings are 0, where the split has no effect
    other_assets: m(f.other),
    dependants: f.dependants ?? 0,
    kids,
    kids_goal_planned: kids > 0 ? f.kidsPlanned : null,
    health_cover: m(f.health),
    life_cover: m(f.life),
    pending_goals: f.goals ?? 0,
  };
}

/** Points of the 100 the score is built from, as the "improve" card shows them. */
export const impactLabel = (item: Pick<ImproveItem, "impact" | "reason">) =>
  item.reason === "missing" ? `Adds ${Number(item.impact)} of 100 points to what is measured` : "Replaces an assumption with your own answer";

type FactLike = { field_key: string; value: string; source_type: string };

/**
 * Pre-fills the form from what the user already told me, so returning users only tap what is missing. Assumptions are
 * never shown as answers, except the equity/debt split, which only divides a savings total the user did give.
 */
export function fromFacts(facts: FactLike[]): QuickForm {
  const known = new Map(facts.filter((f) => f.source_type !== "ESTIMATED").map((f) => [f.field_key, f.value]));
  const all = new Map(facts.map((f) => [f.field_key, f.value]));
  const num = (k: string) => (known.has(k) ? Number(known.get(k)) : null);
  const held = (k: string) => (all.has(k) ? Number(all.get(k)) : null);
  const money = (k: string) => (known.has(k) ? String(Number(known.get(k))) : "");
  const income = num("annual_income");
  const holdings = ["equity_holdings", "debt_holdings", "liquid_assets"].map(held);
  const savings = holdings.some((v) => v !== null) ? holdings.reduce<number>((a, v) => a + (v ?? 0), 0) : null;
  const eq = held("equity_holdings");
  const de = (held("debt_holdings") ?? 0) + (held("liquid_assets") ?? 0);
  const share = eq !== null && eq + de > 0 ? eq / (eq + de) : null;
  const kp = known.get("kids_goal_planned");
  return {
    age: num("age"),
    income: income !== null ? String(Math.round(income / 12)) : "",
    expenses: money("monthly_expenses"),
    emi: money("monthly_emi_total"),
    loans: money("loans_outstanding"),
    sip: money("monthly_investment"),
    savings: savings !== null ? String(savings) : "",
    mix: share === null ? null : share < 0.35 ? "mostly_safe" : share < 0.65 ? "balanced" : "mostly_equity",
    other: money("other_assets"),
    dependants: num("dependants"),
    kids: num("kids"),
    kidsPlanned: kp === undefined ? null : kp === "true",
    health: money("health_cover_amount"),
    life: money("life_cover_amount"),
    goals: num("pending_goals"),
  };
}
