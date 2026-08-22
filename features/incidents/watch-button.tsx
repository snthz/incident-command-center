"use client";

import { useOptimistic, useTransition } from "react";
import { useToast } from "@/components/ui/toaster";
import { cn } from "@/lib/cn";
import { toggleWatchIncident } from "./actions";

export function WatchButton({
  incidentId,
  incidentKey,
  watching,
}: {
  incidentId: string;
  incidentKey: string;
  watching: boolean;
}) {
  const [optimisticWatching, setOptimisticWatching] = useOptimistic(watching);
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  function toggle() {
    const next = !optimisticWatching;
    startTransition(async () => {
      setOptimisticWatching(next);
      const result = await toggleWatchIncident({ incidentId, watch: next });
      if (result.error) {
        toast.push("error", result.error);
      } else {
        toast.push(
          "success",
          next ? `Watching ${incidentKey}` : `Stopped watching ${incidentKey}`,
        );
      }
    });
  }

  return (
    <button
      type="button"
      aria-pressed={optimisticWatching}
      disabled={isPending}
      onClick={toggle}
      className={cn(
        "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        optimisticWatching
          ? "border-line bg-surface-2 text-foreground"
          : "border-line text-muted hover:bg-white/5 hover:text-neutral-200",
      )}
    >
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        className={cn("size-4", optimisticWatching && "text-brand")}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8s-2.4 4.5-6.5 4.5S1.5 8 1.5 8Z" />
        <circle cx="8" cy="8" r="2" />
      </svg>
      {optimisticWatching ? "Watching" : "Watch"}
    </button>
  );
}
