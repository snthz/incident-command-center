import { Suspense } from "react";
import { IncidentBoard } from "./board";
import { DashboardRealtime } from "./dashboard-realtime";
import { IncidentFiltersBar } from "./filters";
import { IncidentListTable } from "./list-table";
import { NewIncidentSheet } from "./new-incident-sheet";
import {
  getActiveIncidents,
  getOrgProjects,
  getProfiles,
  getRecentlyResolved,
  type ProjectItem,
} from "./queries";
import {
  parseDashboardView,
  parseIncidentFilters,
} from "./schema";
import { SeverityStats, SeverityStatsSkeleton } from "./severity-stats";
import { ViewToggle } from "./view-toggle";

export async function IncidentsView({
  searchParams,
  basePath,
  project,
  title,
  description,
}: {
  searchParams: Record<string, string | string[] | undefined>;
  basePath: string;
  project?: ProjectItem;
  title: string;
  description: string;
}) {
  const filters = parseIncidentFilters(searchParams);
  const view = parseDashboardView(searchParams.view);

  const effectiveFilters =
    view === "board" ? { severity: filters.severity, q: filters.q } : filters;
  const includeActive =
    view === "board" || effectiveFilters.status !== "resolved";
  const includeResolved =
    view === "board" ||
    effectiveFilters.status === undefined ||
    effectiveFilters.status === "resolved";

  const order = view === "board" ? "board" : "recent";

  const [active, resolved, profiles, projects] = await Promise.all([
    includeActive
      ? getActiveIncidents(effectiveFilters, order, project?.id)
      : Promise.resolve([]),
    includeResolved
      ? getRecentlyResolved(effectiveFilters, order, project?.id)
      : Promise.resolve([]),
    getProfiles(),
    getOrgProjects(),
  ]);
  const incidents = [...active, ...resolved];

  return (
    <div className="group flex flex-col gap-6">
      <DashboardRealtime />
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="flex items-center gap-2.5 text-xl font-semibold text-foreground">
            {project ? (
              <span
                aria-hidden
                className="size-2.5 rounded-full"
                style={{ backgroundColor: project.color }}
              />
            ) : null}
            {title}
          </h1>
          <p className="text-sm text-muted">{description}</p>
        </div>
        <NewIncidentSheet
          profiles={profiles}
          projects={projects}
          defaultProjectId={project?.id}
        />
      </header>

      <Suspense fallback={<SeverityStatsSkeleton />}>
        <SeverityStats view={view} basePath={basePath} projectId={project?.id} />
      </Suspense>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <IncidentFiltersBar
          filters={effectiveFilters}
          showStatus={view === "list"}
        />
        <ViewToggle view={view} filters={filters} basePath={basePath} />
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
