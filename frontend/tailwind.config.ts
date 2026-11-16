import type { Config } from "tailwindcss";

const rgb = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        surface: rgb("surface"),
        "surface-2": rgb("surface-2"),
        ink: rgb("ink"),
        muted: rgb("muted"),
        line: rgb("line"),
        brand: rgb("brand"),
        "brand-ink": rgb("brand-ink"),
        "brand-strong": rgb("brand-strong"),
        "brand-soft": rgb("brand-soft"),
        ai: rgb("ai"),
        "ai-soft": rgb("ai-soft"),
        positive: rgb("positive"),
        warn: rgb("warn"),
        negative: rgb("negative"),
      },
      borderRadius: { md: "var(--radius-md)", lg: "var(--radius-lg)", xl: "var(--radius-xl)" },
      boxShadow: {
        card: "0 1px 1px rgb(11 27 43 / 0.04), 0 4px 10px rgb(11 27 43 / 0.04), 0 18px 40px rgb(11 27 43 / 0.07)",
        glow: "0 10px 24px -8px rgb(var(--brand) / 0.7)",
        "glow-ai": "0 10px 24px -8px rgb(var(--ai) / 0.7)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, rgb(var(--brand) / 0.78), rgb(var(--brand)))",
        "ai-gradient": "linear-gradient(135deg, rgb(var(--ai) / 0.8), rgb(var(--ai)))",
        "nav-gradient": "linear-gradient(135deg, rgb(var(--grad-a)), rgb(var(--grad-b)))",
      },
      // --tenant-* are set by a workspace theme (src/lib/theme); the --font-* variables come from next/font in app/layout.tsx.
      fontFamily: {
        sans: ["var(--tenant-sans, var(--font-inter))", "system-ui", "sans-serif"],
        display: ["var(--tenant-display, var(--font-grotesk))", "var(--tenant-sans, var(--font-inter))", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
