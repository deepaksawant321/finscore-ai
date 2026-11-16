"use client";

import type { ReactNode } from "react";

import { WorkspaceProvider } from "@/features/workspace/workspace-store";

/** Workspace admin area. Any signed-in user can create a workspace; what they can do inside it follows their role in that workspace. */
export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <WorkspaceProvider>{children}</WorkspaceProvider>;
}
