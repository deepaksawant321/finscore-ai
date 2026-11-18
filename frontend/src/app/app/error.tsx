"use client";

import { useEffect } from "react";

import { Button, Card } from "@/design-system/ui";
import { reportClientError } from "@/lib/analytics";

/** Shown instead of a blank page when a screen crashes. The error is reported to our own server log. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => reportClientError(error.message || "Screen error", "boundary", error.stack), [error]);
  return (
    <Card className="max-w-lg space-y-3">
      <h1 className="font-display text-xl font-semibold">Something went wrong on this screen</h1>
      <p className="text-sm text-muted">Your data is safe. We have been told about the problem. Try again, or go back to Home.</p>
      <div className="flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <a href="/app" className="self-center text-sm text-ai underline">
          Go to Home
        </a>
      </div>
    </Card>
  );
}
