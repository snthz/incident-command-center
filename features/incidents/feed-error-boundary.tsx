"use client";

import { catchError, type ErrorInfo } from "next/error";
import { Button } from "@/components/ui/button";

function FeedErrorFallback(_props: Record<string, unknown>, { retry }: ErrorInfo) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-line px-4 py-6">
      <p className="text-sm font-medium text-foreground">
        The activity feed failed to load
      </p>
      <p className="text-sm text-muted">
        The rest of the incident is unaffected. You can retry loading the feed.
      </p>
      <Button variant="secondary" onClick={() => retry()}>
        Retry
      </Button>
    </div>
  );
}

export const FeedErrorBoundary = catchError(FeedErrorFallback);
