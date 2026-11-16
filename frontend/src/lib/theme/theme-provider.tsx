"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { DEFAULT_THEME, sanitizeTheme, themeToCss } from "./tenant-theme";
import type { WorkspaceTheme } from "./tenant-theme";

const THEME_KEY = "fs-workspace-theme";
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
 * Storage is browser-local until the organisation endpoints exist (MVP 6, decision D-B14).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<WorkspaceTheme>(DEFAULT_THEME);
  const [customised, setCustomised] = useState(false);
  const [mode, setModeState] = useState<ColorMode>("system");

  // Read stored choices after mount so server and first client render match.
  useEffect(() => {
    const stored = read(THEME_KEY);
    if (stored) {
      try {
        setThemeState(sanitizeTheme(JSON.parse(stored)));
        setCustomised(true);
      } catch {
        /* ignore corrupt data */
      }
    }
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
    setThemeState((prev) => {
      const next = sanitizeTheme({ ...prev, ...patch });
      write(THEME_KEY, JSON.stringify(next));
      return next;
    });
    setCustomised(true);
  }, []);

  const reset = useCallback(() => {
    write(THEME_KEY, null);
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
