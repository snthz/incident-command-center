import { cn } from "@/lib/cn";

export type LiveConnectionState = "connecting" | "live" | "reconnecting";

const states: Record<
  LiveConnectionState,
  { indicator: "dot" | "spinner"; tone: string; label: string }
> = {
  connecting: { indicator: "spinner", tone: "border-t-neutral-400", label: "Connecting…" },
  live: { indicator: "dot", tone: "bg-emerald-400", label: "Live" },
  reconnecting: {
    indicator: "spinner",
    tone: "border-t-amber-400",
    label: "Live updates disconnected — reconnecting…",
  },
};

export function LiveBadge({ state }: { state: LiveConnectionState }) {
  const { indicator, tone, label } = states[state];
  return (
    <span role="status" className="inline-flex items-center gap-1.5 text-xs text-muted">
      {indicator === "spinner" ? (
        <span
          aria-hidden
          className={cn(
            "size-3 shrink-0 animate-spin rounded-full border-2 border-line",
            tone,
          )}
        />
      ) : (
        <span aria-hidden className={cn("size-1.5 rounded-full", tone)} />
      )}
      {label}
    </span>
  );
}
