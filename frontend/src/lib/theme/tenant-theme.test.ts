import { describe, expect, it } from "vitest";

import { DEFAULT_THEME, brandWarning, contrastRatio, deriveTokens, hexToRgbTriplet, initials, onBrand, parseHex, sanitizeTheme, themeToCss } from "./tenant-theme";

describe("tenant theme", () => {
  it("parses hex into RGB triplets and rejects anything else", () => {
    expect(hexToRgbTriplet("#0FB5A6")).toBe("15 181 166");
    expect(parseHex("0FB5A6")).toBeNull();
    expect(parseHex("#12")).toBeNull();
  });

  it("picks readable text for the brand colour", () => {
    expect(onBrand("#0FB5A6")).toBe("3 32 28"); // teal: dark text
    expect(onBrand("#1E3A8A")).toBe("255 255 255"); // navy: white text
    for (const c of ["#0FB5A6", "#2563EB", "#7C3AED", "#E11D48", "#F59E0B", "#16A34A", "#0B1B2B"]) {
      const text = onBrand(c).split(" ").map(Number) as [number, number, number];
      expect(contrastRatio(parseHex(c)!, text)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("derives different light and dark tokens and keeps radius ordered", () => {
    const light = deriveTokens({ ...DEFAULT_THEME, brand: "#2563EB", radius: 14 }, "light");
    const dark = deriveTokens({ ...DEFAULT_THEME, brand: "#2563EB", radius: 14 }, "dark");
    const px = (v: string | undefined) => Number.parseInt(v ?? "", 10);
    expect(light["--brand"]).toBe("37 99 235");
    expect(dark["--brand"]).not.toBe(light["--brand"]);
    expect(light["--radius-xl"]).toBe("14px");
    expect(px(light["--radius-lg"])).toBeLessThan(14);
    expect(px(light["--radius-md"])).toBeLessThanOrEqual(px(light["--radius-lg"]));
  });

  it("emits nothing for the default theme and three blocks for a custom one", () => {
    expect(themeToCss(DEFAULT_THEME)).toBe("");
    const css = themeToCss({ ...DEFAULT_THEME, brand: "#7C3AED", font: "dm" });
    expect(css).toContain(":root{");
    expect(css).toContain('@media (prefers-color-scheme: dark){:root:not([data-theme="light"])');
    expect(css).toContain(':root[data-theme="dark"]{');
    expect(css).toContain("--tenant-sans:var(--font-dm)");
  });

  it("warns about colours that are too light for links", () => {
    expect(brandWarning("#0FB5A6")).toBeNull();
    expect(brandWarning("#FFF200")).toMatch(/light/i);
    expect(brandWarning("nope")).toMatch(/#RRGGBB/);
  });

  it("sanitises stored data", () => {
    expect(sanitizeTheme(null)).toEqual(DEFAULT_THEME);
    const t = sanitizeTheme({ name: "  Northstar Bank  ", brand: "red", accent: "#DB2777", radius: 999, font: "comic", poweredBy: false });
    expect(t).toMatchObject({ name: "Northstar Bank", brand: DEFAULT_THEME.brand, accent: "#DB2777", radius: 32, font: "inter", poweredBy: false });
  });

  it("builds initials from the first two words", () => {
    expect(initials("Northstar Bank")).toBe("NB");
    expect(initials("  ")).toBe("W");
  });
});
