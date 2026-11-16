"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

type ToastFn = (message: string) => void;
const Ctx = createContext<ToastFn>(() => {});

/** Short confirmations ("Copied", "Saved"). One message at a time, announced politely to screen readers. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const toast = useCallback<ToastFn>((m) => {
    setMessage(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 2600);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <Ctx.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 lg:bottom-8" role="status" aria-live="polite">
        {message ? <p className="max-w-md rounded-full bg-ink px-5 py-3 text-sm font-semibold text-surface shadow-card">{message}</p> : null}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = (): ToastFn => useContext(Ctx);
