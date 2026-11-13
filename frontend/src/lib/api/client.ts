import createClient from "openapi-fetch";

import type { paths } from "./schema";

/** Typed API client generated from the backend OpenAPI schema (`npm run gen:api`). Same-origin via Next rewrites. */
export const api = createClient<paths>({ baseUrl: "", credentials: "include" });

export type ProblemDetails = { code?: string; title?: string; detail?: string; errors?: { loc: (string | number)[]; msg: string }[] };

export function problemMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  const p = err as ProblemDetails | undefined;
  if (!p) return fallback;
  if (p.errors?.length) return p.errors.map((e) => e.msg.replace(/^Value error, /, "")).join(" ");
  return p.title ?? fallback;
}
