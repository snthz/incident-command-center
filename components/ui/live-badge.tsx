import { cn } from "@/lib/cn";

export type LiveConnectionState = "connecting" | "live" | "reconnecting";

const states: Record<LiveConnectionState, { dot: string; label: string }> = {
  connecting: { dot: "bg-neutral-500", label: "Connecting…" },
  live: { dot: "bg-emerald-400", label: "Live" },
  reconnecting: {
    dot: "bg-amber-400",
    label: "Live updates disconnected — reconnecting…",
  },
};

export function LiveBadge({ state }: { state: LiveConnectionState }) {
  return (
    <span role="status" className="inline-flex items-center gap-1.5 text-xs text-muted">
      <span aria-hidden className={cn("size-1.5 rounded-full", states[state].dot)} />
      {states[state].label}
    </span>
  );
}
