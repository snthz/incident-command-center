import { EmptyState } from "@/components/ui/empty-state";
import { IncidentCard } from "./incident-card";
import type { IncidentListItem } from "./queries";

export function IncidentSection({
  title,
  incidents,
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  incidents: IncidentListItem[];
  emptyTitle: string;
  emptyDescription?: string;
}) {
  return (
    <section aria-label={title}>
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <span className="text-sm text-muted">{incidents.length}</span>
      </div>
      {incidents.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {incidents.map((incident) => (
            <IncidentCard key={incident.id} incident={incident} />
          ))}
        </ul>
      )}
    </section>
  );
}
