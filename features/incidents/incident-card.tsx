import Link from "next/link";
import { TimeAgo } from "@/components/ui/time-ago";
import { SeverityBadge, StatusBadge } from "./badges";
import type { IncidentListItem } from "./queries";

function OwnerChip({ owner }: { owner: IncidentListItem["owner"] }) {
  if (!owner) {
    return <span className="text-xs text-muted">Unassigned</span>;
  }
  const initials = owner.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <span className="flex items-center gap-1.5 text-xs text-muted">
      <span
        aria-hidden
        className="flex size-5 items-center justify-center rounded-full bg-surface-2 text-[9px] font-semibold text-neutral-300"
      >
        {initials}
      </span>
      {owner.name}
    </span>
  );
}

export function IncidentCard({ incident }: { incident: IncidentListItem }) {
  return (
    <li>
      <Link
        href={`/incidents/${incident.id}`}
        className="flex h-full flex-col gap-3 rounded-lg border border-line bg-surface p-4 transition-colors hover:border-neutral-600 hover:bg-surface-2"
      >
        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge severity={incident.severity} />
          <StatusBadge status={incident.status} />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-foreground">{incident.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted">{incident.description}</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          <OwnerChip owner={incident.owner} />
          <span className="flex items-center gap-2 text-xs text-muted">
            <span>
              {incident._count.updates} update{incident._count.updates === 1 ? "" : "s"}
            </span>
            <span aria-hidden>·</span>
            <TimeAgo date={incident.updatedAt} />
          </span>
        </div>
      </Link>
    </li>
  );
}
