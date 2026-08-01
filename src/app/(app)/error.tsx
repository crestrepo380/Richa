"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] unhandled error", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="rounded-full bg-danger-muted p-3" aria-hidden>
        <AlertTriangle className="size-6 text-danger" />
      </div>
      <div className="space-y-1">
        <h2 className="font-semibold">Something went wrong</h2>
        <p className="max-w-sm text-sm text-muted">
          The page could not be loaded. Try again — if it keeps happening, let
          your administrator know.
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-muted">
            Reference: {error.digest}
          </p>
        )}
      </div>
      <Button variant="secondary" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
