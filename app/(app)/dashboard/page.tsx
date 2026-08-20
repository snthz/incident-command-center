import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/dal";
import { IncidentFiltersBar } from "@/features/incidents/filters";
import { IncidentSection } from "@/features/incidents/incident-section";
import {
  getActiveIncidents,
  getRecentlyResolved,
  RESOLVED_WINDOW_DAYS,
} from "@/features/incidents/queries";
import { parseIncidentFilters } from "@/features/incidents/schema";
import {
  SeverityStats,
  SeverityStatsSkeleton,
} from "@/features/incidents/severity-stats";

export const metadata: Metadata = { title: "Dashboard — Incident Command Center" };

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  await requireUser();
  const filters = parseIncidentFilters(await searchParams);

  const showActive = filters.status !== "resolved";
  const showResolved = filters.status === undefined || filters.status === "resolved";

  const [active, resolved] = await Promise.all([
    showActive ? getActiveIncidents(filters) : Promise.resolve([]),
    showResolved ? getRecentlyResolved(filters) : Promise.resolve([]),
  ]);

  return (
    <div className="group flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">Incidents</h1>
        <p className="text-sm text-muted">
          Live view of what the team is responding to right now.
        </p>
      </header>

      <Suspense fallback={<SeverityStatsSkeleton />}>
        <SeverityStats />
      </Suspense>

      <IncidentFiltersBar filters={filters} />

      <div className="flex flex-col gap-8 transition-opacity group-has-data-pending:opacity-60">
        {showActive ? (
          <IncidentSection
            title="Active incidents"
            incidents={active}
            emptyTitle="No active incidents match these filters"
            emptyDescription="Adjust or clear the filters to see more."
          />
        ) : null}
        {showResolved ? (
          <IncidentSection
            title={`Recently resolved (last ${RESOLVED_WINDOW_DAYS} days)`}
            incidents={resolved}
            emptyTitle="Nothing resolved recently matches these filters"
            emptyDescription="Adjust or clear the filters to see more."
          />
        ) : null}
      </div>
    </div>
  );
}
