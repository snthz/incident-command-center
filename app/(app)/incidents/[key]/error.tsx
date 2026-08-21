"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function IncidentError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-surface-2/40 px-6 py-12 text-center">
      <h2 className="text-base font-semibold text-foreground">
        We couldn&apos;t load this incident
      </h2>
      <p className="text-sm text-muted">
        Something went wrong on our side. Your session is still active.
      </p>
      <div className="mt-2 flex items-center gap-3">
        <Button onClick={() => retry()}>Try again</Button>
        <Link
          href="/dashboard"
          className="text-sm text-muted underline-offset-4 hover:text-neutral-200 hover:underline"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
