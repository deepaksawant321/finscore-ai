import { describe, expect, it } from "vitest";

import { formatInr, formatInrCompact } from "./format";

describe("INR formatting", () => {
  it("groups digits Indian style", () => {
    expect(formatInr(3400000).replace(/\s/g, "")).toBe("₹34,00,000");
  });
  it("uses lakh and crore compact forms", () => {
    expect(formatInrCompact(3400000)).toBe("₹34L");
    expect(formatInrCompact(12000000)).toBe("₹1.2Cr");
    expect(formatInrCompact(-250000)).toBe("-₹2.5L");
  });
  it("keeps small values exact", () => {
    expect(formatInrCompact(5200).replace(/\s/g, "")).toBe("₹5,200");
  });
});
