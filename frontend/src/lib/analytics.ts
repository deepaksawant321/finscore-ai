"use client";

import { api } from "@/lib/api/client";

/**
 * First-party product analytics (audit Phase 1 item 1.11). Events go to our own API (POST /api/v1/events) and nowhere else.
 * Never send answers, amounts, names or emails: properties are short keys (a card id, an error code). The server drops anything
 * else. Tracking must never break the page, so every failure is swallowed.
 */
export type EventName =
  | "landing_view" | "cta_click" | "legal_view"
  | "register_view" | "register_submit" | "register_error" | "register_done" | "verify_done"
  | "login_view" | "login_done" | "login_error"
  | "journey_start" | "journey_answer" | "journey_skip" | "chapter_complete" | "score_revealed"
  | "home_view" | "score_view" | "coach_ask" | "simulation_run" | "goal_created"
  | "export_requested" | "deletion_scheduled" | "support_requested" | "workspace_created" | "plan_upgrade_requested";

type Props = Partial<Record<"card" | "chapter" | "code" | "page" | "target" | "routed_to" | "kind" | "source", string>>;

const ANON_KEY = "fs-anon-id";

/** A random id for this browser, so steps before sign-up can be counted as one person. Not linked to anything else. */
function anonId(): string | undefined {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return undefined;
  }
}

export function track(name: EventName, props?: Props): void {
  if (typeof window === "undefined") return;
  try {
    void api
      .POST("/api/v1/events", { body: { name, props: props ?? null, path: window.location.pathname, anon_id: anonId() ?? null } })
      .catch(() => undefined);
  } catch {
    /* never let analytics break the page */
  }
}

let reported = 0;
const seen = new Set<string>();

/** Sends a browser error to our own server log. At most 10 distinct errors per page load. */
export function reportClientError(message: string, source: string, stack?: string): void {
  if (typeof window === "undefined" || reported >= 10 || seen.has(message)) return;
  seen.add(message);
  reported += 1;
  try {
    void api
      .POST("/api/v1/client-errors", {
        body: { message: message.slice(0, 500), source, path: window.location.pathname, stack: stack?.slice(0, 4000) ?? null },
      })
      .catch(() => undefined);
  } catch {
    /* ignore */
  }
}
