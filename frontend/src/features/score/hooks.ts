"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api/client";

/** Current score, or null when the user has none yet (404). Throws on other errors. */
export function useCurrentScore() {
  return useQuery({
    queryKey: ["score", "current"],
    queryFn: async () => {
      const { data, response } = await api.GET("/api/v1/score/current");
      if (response.status === 404) return null;
      if (!data) throw new Error("Could not load your score");
      return data;
    },
  });
}
