import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { TimeAgo } from "@/components/ui/time-ago";
import { SeverityBadge, StatusLabel } from "./badges";
import { OwnerChip } from "./owner-chip";
import type { IncidentListItem } from "./queries";

export function IncidentListTable({ incidents }: { incidents: IncidentListItem[] }) {
  if (incidents.length === 0) {
    return (
      <EmptyState
        title="No incidents match these filters"
        description="Adjust or clear the filters to see more."
      />
    );
  }

  return (
    <div className="relative overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-180 border-collapse text-sm">
        <thead>
          <tr className="border-b border-line bg-surface-2/50 text-left text-xs uppercase tracking-wide text-muted">
            <th scope="col" className="px-4 py-2.5 font-medium">Key</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Incident</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Severity</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Owner</th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">Updates</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Last updated</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((incident) => (
            <tr
              key={incident.id}
              className="border-b border-line last:border-b-0 hover:bg-white/[0.03]"
            >
              <td className="px-4 py-3">
                <Link
                  href={`/incidents/${incident.key}`}
                  className="font-mono text-xs text-muted hover:text-foreground hover:underline"
                >
                  {incident.key}
                </Link>
              </td>
              <td className="max-w-md px-4 py-3">
                <Link
                  href={`/incidents/${incident.key}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {incident.title}
                </Link>
                <p className="mt-0.5 truncate text-xs text-muted">
                  {incident.description}
                </p>
              </td>
              <td className="px-4 py-3">
                <SeverityBadge severity={incident.severity} />
              </td>
              <td className="px-4 py-3">
                <StatusLabel status={incident.status} className="text-sm" />
              </td>
              <td className="px-4 py-3">
                <OwnerChip owner={incident.owner} />
              </td>
              <td className="px-4 py-3 text-right text-muted">
                {incident._count.updates}
              </td>
              <td className="px-4 py-3 text-muted">
                <TimeAgo date={incident.updatedAt} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
