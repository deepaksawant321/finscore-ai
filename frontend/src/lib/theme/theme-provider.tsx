"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { DEFAULT_THEME, sanitizeTheme, themeToCss } from "./tenant-theme";
import type { WorkspaceTheme } from "./tenant-theme";

// Older builds kept the tenant theme here, which leaked one workspace's brand onto public pages and other users' sessions on a
// shared device. It is now held in memory only and deleted from storage on load.
const LEGACY_THEME_KEY = "fs-workspace-theme";
const MODE_KEY = "fs-color-mode";
const STYLE_ID = "workspace-theme";

export type ColorMode = "light" | "dark" | "system";

type ThemeCtx = {
  theme: WorkspaceTheme;
  /** True once the user changed something in this browser. Drives the setup checklist. */
  customised: boolean;
  setTheme: (patch: Partial<WorkspaceTheme>) => void;
  reset: () => void;
  mode: ColorMode;
  setMode: (m: ColorMode) => void;
};

const Ctx = createContext<ThemeCtx | null>(null);

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* private mode or blocked storage: the theme still applies for this visit */
  }
};

/**
 * Applies the white-label workspace theme and the light/dark choice.
 * The tenant theme is in memory only: the workspace screens apply the server's saved branding while they are open and reset it
 * when they close, so public pages and the consumer app always show the default 5nance brand. Only light/dark is remembered.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<WorkspaceTheme>(DEFAULT_THEME);
  const [customised, setCustomised] = useState(false);
  const [mode, setModeState] = useState<ColorMode>("system");

  // Read stored choices after mount so server and first client render match.
  useEffect(() => {
    write(LEGACY_THEME_KEY, null);
    const m = read(MODE_KEY);
    if (m === "light" || m === "dark") setModeState(m);
  }, []);

  useEffect(() => {
    let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = STYLE_ID;
      document.head.appendChild(el);
    }
    el.textContent = themeToCss(theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    if (mode === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", mode);
  }, [mode]);

  const setTheme = useCallback((patch: Partial<WorkspaceTheme>) => {
    setThemeState((prev) => sanitizeTheme({ ...prev, ...patch }));
    setCustomised(true);
  }, []);

  const reset = useCallback(() => {
    setThemeState(DEFAULT_THEME);
    setCustomised(false);
  }, []);

  const setMode = useCallback((m: ColorMode) => {
    write(MODE_KEY, m === "system" ? null : m);
    setModeState(m);
  }, []);

  const value = useMemo(() => ({ theme, customised, setTheme, reset, mode, setMode }), [theme, customised, setTheme, reset, mode, setMode]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** True when the page is currently dark: an explicit choice wins, otherwise the operating-system setting. */
export function useIsDark(): boolean {
  const { mode } = useWorkspaceTheme();
  const [system, setSystem] = useState(false);
  useEffect(() => {
    if (typeof matchMedia !== "function") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    setSystem(mq.matches);
    const on = (e: MediaQueryListEvent) => setSystem(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return mode === "system" ? system : mode === "dark";
}

export function useWorkspaceTheme(): ThemeCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWorkspaceTheme must be used inside <ThemeProvider>");
  return v;
}
