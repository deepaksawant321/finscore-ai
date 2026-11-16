"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type { ProblemDetails } from "@/lib/api/client";

import type { MatrixScore } from "./logic";

const KEY = ["matrix-score"] as const;

/** An API problem that keeps the machine-readable code, so the screen can tell "needs more data" from "not available". */
export class ScoreProblem extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly detail?: string,
  ) {
    super(message);
  }
}

/**
 * Calculates the workbook-based score on demand. Each calculation is written to the audit log, so it runs when the user asks
 * (not on every page view). The latest result is kept in the query cache so leaving and returning shows it again.
 */
export function useMatrixScore() {
  const qc = useQueryClient();
  const latest = useQuery<MatrixScore | null>({ queryKey: KEY, queryFn: async () => null, enabled: false, staleTime: Infinity });
  const calculate = useMutation({
    mutationFn: async (): Promise<MatrixScore> => {
      const { data, error } = await api.POST("/api/v1/score/matrix/compute");
      if (!data) {
        const p = error as ProblemDetails | undefined;
        throw new ScoreProblem(p?.title ?? "Could not calculate your score. Please try again.", p?.code, p?.detail);
      }
      return data;
    },
    onSuccess: (data) => qc.setQueryData(KEY, data),
  });
  return { score: latest.data ?? null, calculate };
}
