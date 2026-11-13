import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-2": "rgb(var(--surface-2) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        brand: "rgb(var(--brand) / <alpha-value>)",
        "brand-ink": "rgb(var(--brand-ink) / <alpha-value>)",
        ai: "rgb(var(--ai) / <alpha-value>)",
        positive: "rgb(var(--positive) / <alpha-value>)",
        warn: "rgb(var(--warn) / <alpha-value>)",
        negative: "rgb(var(--negative) / <alpha-value>)",
      },
      borderRadius: { md: "8px", lg: "12px", xl: "20px" },
      boxShadow: { card: "0 1px 2px rgb(11 27 43 / 0.06), 0 8px 24px rgb(11 27 43 / 0.06)" },
      fontFamily: { sans: ["var(--font-sans)", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
};
export default config;
