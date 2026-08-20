"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
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
    <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-surface px-6 py-12 text-center">
      <h2 className="text-base font-semibold text-foreground">
        We couldn&apos;t load the incidents
      </h2>
      <p className="text-sm text-muted">
        Something went wrong on our side. Your session is still active.
      </p>
      <Button onClick={() => retry()} className="mt-2">
        Try again
      </Button>
    </div>
  );
}
