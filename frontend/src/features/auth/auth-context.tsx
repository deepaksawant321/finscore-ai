"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { api, problemMessage } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

export type User = components["schemas"]["UserOut"];
type Status = "loading" | "authenticated" | "anonymous";

let accessToken: string | null = null;
let inflightRefresh: Promise<boolean> | null = null;

api.use({
  onRequest({ request }) {
    if (accessToken) request.headers.set("Authorization", `Bearer ${accessToken}`);
    return request;
  },
});

/** Single-flight refresh: concurrent callers (React strict-mode double effects, parallel requests) share one rotation,
 *  otherwise the second call would replay a rotated token and trigger reuse detection (logging the user out). */
export function refreshSession(): Promise<boolean> {
  inflightRefresh ??= (async () => {
    const { data } = await api.POST("/api/v1/auth/refresh");
    accessToken = data?.access_token ?? null;
    return accessToken !== null;
  })().finally(() => {
    inflightRefresh = null;
  });
  return inflightRefresh;
}

type AuthValue = {
  user: User | null;
  status: Status;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
};
const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  const loadUser = useCallback(async () => {
    const { data } = await api.GET("/api/v1/users/me");
    setUser(data ?? null);
    setStatus(data ? "authenticated" : "anonymous");
  }, []);

  useEffect(() => {
    (async () => {
      if (await refreshSession()) await loadUser();
      else setStatus("anonymous");
    })();
  }, [loadUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await api.POST("/api/v1/auth/login", { body: { email, password } });
      if (!data) {
        const code = (error as { code?: string } | undefined)?.code;
        if (code === "email_not_verified") return "Please verify your email first — check your inbox.";
        if (code === "account_locked") return "Too many attempts. Try again in a few minutes.";
        if (code === "invalid_credentials") return "Incorrect email or password.";
        return problemMessage(error);
      }
      accessToken = data.access_token;
      await loadUser();
      return null;
    },
    [loadUser],
  );

  const logout = useCallback(async () => {
    await api.POST("/api/v1/auth/logout");
    accessToken = null;
    setUser(null);
    setStatus("anonymous");
  }, []);

  const value = useMemo(() => ({ user, status, login, logout, reload: loadUser }), [user, status, login, logout, loadUser]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}
