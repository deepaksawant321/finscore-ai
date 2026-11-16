/**
 * Workspace (white-label) theme. Pure functions only: the provider in theme-provider.tsx applies the result.
 *
 * Colours are turned into RGB triplets ("r g b") so Tailwind `/alpha` utilities keep working, and every derived
 * token (soft background, strong text colour, dark-mode variants) is computed here instead of with CSS color-mix().
 */
export type FontChoice = "inter" | "jakarta" | "dm";

export type WorkspaceTheme = {
  name: string;
  brand: string; // #RRGGBB
  accent: string; // #RRGGBB, used for AI features
  radius: number; // card corner radius in px (8–32)
  font: FontChoice;
  poweredBy: boolean;
};

export const DEFAULT_THEME: WorkspaceTheme = { name: "5nance", brand: "#0FB5A6", accent: "#4F46E5", radius: 24, font: "inter", poweredBy: true };

export const FONT_CHOICES: { id: FontChoice; label: string }[] = [
  { id: "inter", label: "Inter" },
  { id: "jakarta", label: "Plus Jakarta" },
  { id: "dm", label: "DM Sans" },
];

type RGB = [number, number, number];
const WHITE: RGB = [255, 255, 255];
const BLACK: RGB = [0, 0, 0];
const DARK_SURFACE: RGB = [15, 29, 43];
const DARK_INK: RGB = [3, 32, 28];

const HEX = /^#[0-9a-fA-F]{6}$/;
export const isHex = (v: string): boolean => HEX.test(v);

export function parseHex(hex: string): RGB | null {
  if (!isHex(hex)) return null;
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const triplet = (c: RGB): string => `${Math.round(c[0])} ${Math.round(c[1])} ${Math.round(c[2])}`;
export const hexToRgbTriplet = (hex: string): string | null => {
  const c = parseHex(hex);
  return c ? triplet(c) : null;
};

/** Linear blend: t=0 gives `a`, t=1 gives `b`. */
export const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** WCAG relative luminance. */
const channel = (v: number): number => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};

export function luminance(c: RGB): number {
  return 0.2126 * channel(c[0]) + 0.7152 * channel(c[1]) + 0.0722 * channel(c[2]);
}

export function contrastRatio(a: RGB, b: RGB): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Text colour (triplet) to put on top of `brand`: whichever of near-black or white has the better contrast. */
export function onBrand(brand: string): string {
  const c = parseHex(brand);
  if (!c) return triplet(DARK_INK);
  return contrastRatio(c, DARK_INK) >= contrastRatio(c, WHITE) ? triplet(DARK_INK) : triplet(WHITE);
}

/** Returns a plain-language warning when the brand colour would make links or buttons hard to read, otherwise null. */
export function brandWarning(brand: string): string | null {
  const c = parseHex(brand);
  if (!c) return "Enter a colour as #RRGGBB.";
  const linkOnWhite = contrastRatio(mix(c, BLACK, 0.32), WHITE);
  if (linkOnWhite < 4.5) return "This colour is very light, so links and labels may be hard to read on white. Try a deeper shade.";
  const buttonText = Math.max(contrastRatio(c, DARK_INK), contrastRatio(c, WHITE));
  if (buttonText < 4.5) return "Button text will be hard to read on this colour. Try a lighter or darker shade.";
  return null;
}

const FONT_VARS: Record<FontChoice, { sans: string; display: string }> = {
  inter: { sans: "var(--font-inter)", display: "var(--font-grotesk)" },
  jakarta: { sans: "var(--font-jakarta)", display: "var(--font-jakarta)" },
  dm: { sans: "var(--font-dm)", display: "var(--font-dm)" },
};

export const clampRadius = (r: number): number => Math.min(32, Math.max(8, Math.round(Number.isFinite(r) ? r : DEFAULT_THEME.radius)));

/** CSS custom properties for one colour mode. Shared radius/font tokens are included in both. */
export function deriveTokens(theme: WorkspaceTheme, mode: "light" | "dark"): Record<string, string> {
  const brand = parseHex(theme.brand) ?? parseHex(DEFAULT_THEME.brand)!;
  const accent = parseHex(theme.accent) ?? parseHex(DEFAULT_THEME.accent)!;
  const radius = clampRadius(theme.radius);
  const shared = {
    "--grad-a": triplet(mix(brand, BLACK, 0.42)),
    "--grad-b": triplet(accent),
    "--radius-xl": `${radius}px`,
    "--radius-lg": `${Math.round(radius * 0.6)}px`,
    "--radius-md": `${Math.max(6, Math.round(radius / 3))}px`,
    "--tenant-sans": FONT_VARS[theme.font].sans,
    "--tenant-display": FONT_VARS[theme.font].display,
  };
  if (mode === "light") {
    return {
      ...shared,
      "--brand": triplet(brand),
      "--brand-strong": triplet(mix(brand, BLACK, 0.32)),
      "--brand-soft": triplet(mix(brand, WHITE, 0.85)),
      "--brand-ink": onBrand(theme.brand),
      "--ai": triplet(accent),
      "--ai-soft": triplet(mix(accent, WHITE, 0.87)),
    };
  }
  const lifted = mix(brand, WHITE, 0.2);
  return {
    ...shared,
    "--brand": triplet(lifted),
    "--brand-strong": triplet(mix(brand, WHITE, 0.35)),
    "--brand-soft": triplet(mix(DARK_SURFACE, brand, 0.24)),
    "--brand-ink": onBrand(`#${[...lifted].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`),
    "--ai": triplet(mix(accent, WHITE, 0.38)),
    "--ai-soft": triplet(mix(DARK_SURFACE, accent, 0.3)),
  };
}

const block = (tokens: Record<string, string>) =>
  Object.entries(tokens)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");

export const isDefaultTheme = (t: WorkspaceTheme): boolean =>
  t.brand.toLowerCase() === DEFAULT_THEME.brand.toLowerCase() &&
  t.accent.toLowerCase() === DEFAULT_THEME.accent.toLowerCase() &&
  clampRadius(t.radius) === DEFAULT_THEME.radius &&
  t.font === DEFAULT_THEME.font;

/** Stylesheet text that mirrors the three token blocks in globals.css (light, system dark, explicit dark). Empty for the default theme. */
export function themeToCss(theme: WorkspaceTheme): string {
  if (isDefaultTheme(theme)) return "";
  const light = block(deriveTokens(theme, "light"));
  const dark = block(deriveTokens(theme, "dark"));
  return `:root{${light}}@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${dark}}}:root[data-theme="dark"]{${dark}}`;
}

/** Validates data read from storage; anything unexpected falls back to the default for that field. */
export function sanitizeTheme(input: unknown): WorkspaceTheme {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const str = (v: unknown, d: string) => (typeof v === "string" ? v : d);
  const hex = (v: unknown, d: string) => (typeof v === "string" && isHex(v) ? v : d);
  const font = FONT_CHOICES.some((f) => f.id === o.font) ? (o.font as FontChoice) : DEFAULT_THEME.font;
  return {
    name: str(o.name, DEFAULT_THEME.name).trim().slice(0, 28) || DEFAULT_THEME.name,
    brand: hex(o.brand, DEFAULT_THEME.brand),
    accent: hex(o.accent, DEFAULT_THEME.accent),
    radius: clampRadius(typeof o.radius === "number" ? o.radius : DEFAULT_THEME.radius),
    font,
    poweredBy: typeof o.poweredBy === "boolean" ? o.poweredBy : DEFAULT_THEME.poweredBy,
  };
}

export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "W";
