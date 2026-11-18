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
 * The FinScore (workbook model, the product's only score). `score` is the current recorded calculation: the server reuses the
 * last one while the answers are unchanged and records a new one when they changed, so viewing does not flood the audit log.
 * `calculate` forces a fresh calculation (the "Calculate again" button).
 */
export function useMatrixScore() {
  const qc = useQueryClient();
  const latest = useQuery<MatrixScore | null>({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error, response } = await api.GET("/api/v1/score/matrix/current");
      if (!response.ok) {
        const p = error as ProblemDetails | undefined;
        throw new ScoreProblem(p?.title ?? "Could not load your score right now.", p?.code, p?.detail);
      }
      return (data as MatrixScore | null | undefined) ?? null;
    },
    retry: false,
  });
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
  return { score: latest.data ?? null, loading: latest.isLoading, loadError: latest.error, calculate };
}
