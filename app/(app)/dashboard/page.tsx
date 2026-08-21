import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/dal";
import { IncidentBoard } from "@/features/incidents/board";
import { DashboardRealtime } from "@/features/incidents/dashboard-realtime";
import { IncidentFiltersBar } from "@/features/incidents/filters";
import { IncidentListTable } from "@/features/incidents/list-table";
import { NewIncidentSheet } from "@/features/incidents/new-incident-sheet";
import {
  getActiveIncidents,
  getProfiles,
  getRecentlyResolved,
} from "@/features/incidents/queries";
import {
  parseDashboardView,
  parseIncidentFilters,
} from "@/features/incidents/schema";
import {
  SeverityStats,
  SeverityStatsSkeleton,
} from "@/features/incidents/severity-stats";
import { ViewToggle } from "@/features/incidents/view-toggle";

export const metadata: Metadata = { title: "Dashboard — Incident Command Center" };

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  await requireUser();
  const params = await searchParams;
  const filters = parseIncidentFilters(params);
  const view = parseDashboardView(params.view);

  const effectiveFilters =
    view === "board" ? { severity: filters.severity, q: filters.q } : filters;
  const includeActive =
    view === "board" || effectiveFilters.status !== "resolved";
  const includeResolved =
    view === "board" ||
    effectiveFilters.status === undefined ||
    effectiveFilters.status === "resolved";

  const order = view === "board" ? "board" : "recent";

  const [active, resolved, profiles] = await Promise.all([
    includeActive
      ? getActiveIncidents(effectiveFilters, order)
      : Promise.resolve([]),
    includeResolved
      ? getRecentlyResolved(effectiveFilters, order)
      : Promise.resolve([]),
    getProfiles(),
  ]);
  const incidents = [...active, ...resolved];

  return (
    <div className="group flex flex-col gap-6">
      <DashboardRealtime />
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-foreground">Incidents</h1>
          <p className="text-sm text-muted">
            Live view of what the team is responding to right now. Resolved shows
            the last 7 days.
          </p>
        </div>
        <NewIncidentSheet profiles={profiles} />
      </header>

      <Suspense fallback={<SeverityStatsSkeleton />}>
        <SeverityStats view={view} />
      </Suspense>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <IncidentFiltersBar
          filters={effectiveFilters}
          showStatus={view === "list"}
        />
        <ViewToggle view={view} filters={filters} />
      </div>

      <div className="transition-opacity group-has-data-pending:opacity-60">
        {view === "board" ? (
          <IncidentBoard incidents={incidents} />
        ) : (
          <IncidentListTable incidents={incidents} />
        )}
      </div>
    </div>
  );
}
