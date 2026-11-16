"use client";

import { useQuery } from "@tanstack/react-query";

import { api, problemMessage } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

type S = components["schemas"];
export type Org = S["OrgOut"];
export type OrgSummary = S["OrgSummary"];
export type Member = S["MemberOut"];
export type ApiKey = S["ApiKeyOut"];
export type Billing = S["BillingOut"];
export type Plan = S["PlanOut"];
export type Invoice = S["InvoiceOut"];
export type Activity = S["ActivityOut"];
export type BrandingBody = S["BrandingIn"];
export type Role = Member["role"];

/** Turns an openapi-fetch result into its data, or throws an Error carrying the server's plain-language message. */
export async function unwrap<T>(p: Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
  const { data, error, response } = await p;
  if (data === undefined || !response.ok) throw new Error(problemMessage(error));
  return data;
}

/** For calls that answer 204 No Content. */
export async function unwrapEmpty(p: Promise<{ error?: unknown; response: Response }>): Promise<void> {
  const { error, response } = await p;
  if (!response.ok) throw new Error(problemMessage(error));
}

export const orgKeys = {
  list: ["orgs"] as const,
  detail: (id: string) => ["org", id] as const,
  members: (id: string) => ["org", id, "members"] as const,
  keys: (id: string) => ["org", id, "keys"] as const,
  billing: (id: string) => ["org", id, "billing"] as const,
  activity: (id: string) => ["org", id, "activity"] as const,
};

export function useOrgs() {
  return useQuery({
    queryKey: orgKeys.list,
    queryFn: async () => unwrap(api.GET("/api/v1/orgs")),
    staleTime: 30_000,
  });
}

export function useOrgDetail(id: string | undefined) {
  return useQuery({
    queryKey: orgKeys.detail(id ?? ""),
    enabled: !!id,
    queryFn: async () => unwrap(api.GET("/api/v1/orgs/{org_id}", { params: { path: { org_id: id as string } } })),
  });
}

export function useMembers(id: string | undefined) {
  return useQuery({
    queryKey: orgKeys.members(id ?? ""),
    enabled: !!id,
    queryFn: async () => unwrap(api.GET("/api/v1/orgs/{org_id}/members", { params: { path: { org_id: id as string } } })),
  });
}

export function useApiKeys(id: string | undefined, allowed: boolean) {
  return useQuery({
    queryKey: orgKeys.keys(id ?? ""),
    enabled: !!id && allowed,
    queryFn: async () => unwrap(api.GET("/api/v1/orgs/{org_id}/api-keys", { params: { path: { org_id: id as string } } })),
  });
}

export function useBilling(id: string | undefined, allowed: boolean) {
  return useQuery({
    queryKey: orgKeys.billing(id ?? ""),
    enabled: !!id && allowed,
    queryFn: async () => unwrap(api.GET("/api/v1/orgs/{org_id}/billing", { params: { path: { org_id: id as string } } })),
  });
}

export function useActivity(id: string | undefined) {
  return useQuery({
    queryKey: orgKeys.activity(id ?? ""),
    enabled: !!id,
    queryFn: async () => unwrap(api.GET("/api/v1/orgs/{org_id}/activity", { params: { path: { org_id: id as string } } })),
  });
}
