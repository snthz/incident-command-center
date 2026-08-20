import { cn } from "@/lib/cn";
import type {
  IncidentSeverity,
  IncidentStatus,
} from "@/lib/generated/prisma/enums";

const badgeBase =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium";

const severityStyles: Record<IncidentSeverity, { label: string; className: string; icon: React.ReactNode }> = {
  critical: {
    label: "Critical",
    className: "border-red-500/30 bg-red-500/10 text-red-300",
    icon: (
      <svg aria-hidden viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 6.5 6 2.5l4 4M2 9.5l4-4 4 4" />
      </svg>
    ),
  },
  high: {
    label: "High",
    className: "border-orange-500/30 bg-orange-500/10 text-orange-300",
    icon: (
      <svg aria-hidden viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 8 6 4l4 4" />
      </svg>
    ),
  },
  medium: {
    label: "Medium",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    icon: (
      <svg aria-hidden viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M2.5 4.5h7M2.5 7.5h7" />
      </svg>
    ),
  },
  low: {
    label: "Low",
    className: "border-sky-500/30 bg-sky-500/10 text-sky-300",
    icon: (
      <svg aria-hidden viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 4 6 8l4-4" />
      </svg>
    ),
  },
};

const statusStyles: Record<IncidentStatus, { label: string; className: string; icon: React.ReactNode }> = {
  investigating: {
    label: "Investigating",
    className: "border-rose-500/30 bg-rose-500/10 text-rose-300",
    icon: (
      <svg aria-hidden viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <circle cx="5.2" cy="5.2" r="3.2" />
        <path d="m7.8 7.8 2.2 2.2" />
      </svg>
    ),
  },
  identified: {
    label: "Identified",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    icon: (
      <svg aria-hidden viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="6" cy="6" r="4.2" />
        <circle cx="6" cy="6" r="1.4" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  monitoring: {
    label: "Monitoring",
    className: "border-sky-500/30 bg-sky-500/10 text-sky-300",
    icon: (
      <svg aria-hidden viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1.5 6h2l1.5-3.5L7 9l1.5-3h2" />
      </svg>
    ),
  },
  resolved: {
    label: "Resolved",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    icon: (
      <svg aria-hidden viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="m2.5 6.5 2.5 2.5 4.5-5.5" />
      </svg>
    ),
  },
};

export const statusTextColor: Record<IncidentStatus, string> = {
  investigating: "text-rose-300",
  identified: "text-amber-300",
  monitoring: "text-sky-300",
  resolved: "text-emerald-300",
};

export function StatusIcon({ status, className }: { status: IncidentStatus; className?: string }) {
  return (
    <span className={cn("inline-flex", statusTextColor[status], className)}>
      {statusStyles[status].icon}
    </span>
  );
}

export function StatusLabel({ status, className }: { status: IncidentStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-muted", className)}>
      {status === "resolved" ? <StatusIcon status={status} /> : null}
      {statusStyles[status].label}
    </span>
  );
}

export function SeverityBadge({ severity, className }: { severity: IncidentSeverity; className?: string }) {
  const style = severityStyles[severity];
  return (
    <span className={cn(badgeBase, style.className, className)}>
      {style.icon}
      {style.label}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: IncidentStatus; className?: string }) {
  const style = statusStyles[status];
  return (
    <span className={cn(badgeBase, style.className, className)}>
      {style.icon}
      {style.label}
    </span>
  );
}
