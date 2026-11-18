"use client";

import { useEffect } from "react";

import { reportClientError, track } from "./analytics";
import type { EventName } from "./analytics";

/** Installs browser error reporting once for the whole app. */
export function ErrorReporter() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => reportClientError(e.message || "Unknown error", "window_error", e.error?.stack);
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason as { message?: string; stack?: string } | undefined;
      reportClientError(r?.message ?? String(e.reason), "unhandled_rejection", r?.stack);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}

/** Records one view event when a page mounts (usable from server components). */
export function TrackView({ name, page }: { name: EventName; page?: string }) {
  useEffect(() => track(name, page ? { page } : undefined), [name, page]);
  return null;
}
