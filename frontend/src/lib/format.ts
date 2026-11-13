/** Indian-style currency formatting. Display only — all financial calculation happens in the backend engines. */
const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export function formatInr(amount: number): string {
  return inr.format(amount);
}

/** Compact lakh/crore form, e.g. 3_400_000 -> "₹34L", 12_000_000 -> "₹1.2Cr". */
export function formatInrCompact(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const a = Math.abs(amount);
  const trim = (n: number) => String(Number(n.toFixed(2)));
  if (a >= 1e7) return `${sign}₹${trim(a / 1e7)}Cr`;
  if (a >= 1e5) return `${sign}₹${trim(a / 1e5)}L`;
  return `${sign}${formatInr(a)}`;
}
