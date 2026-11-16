"use client";

import { useQuery } from "@tanstack/react-query";

import { api, problemMessage } from "@/lib/api/client";

/**
 * Ranked next actions. Same query key and function as the Actions page, so the two share one cache entry.
 * The refresh endpoint is idempotent: it re-evaluates the rules on the server and may verify completed actions.
 */
export function useActions() {
  return useQuery({
    queryKey: ["actions"],
    queryFn: async () => {
      const { data, error } = await api.POST("/api/v1/actions/refresh");
      if (!data) throw new Error(problemMessage(error));
      return data;
    },
    retry: false,
  });
}
