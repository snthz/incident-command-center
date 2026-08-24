import { Suspense } from "react";
import { HistoryNav } from "@/features/navigation/history-nav";
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
} from "../queries";
import {
  parseDashboardView,
  parseIncidentFilters,
} from "../schema";
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
      <header className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <div className="flex h-8 items-center gap-2 text-sm text-muted">
            <HistoryNav />
            {project ? (
              <>
                <span>Projects</span>
                <span aria-hidden className="text-neutral-600">/</span>
                <span className="text-neutral-300">{project.name}</span>
              </>
            ) : (
              <span className="text-neutral-300">Overview</span>
            )}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground" title={description}>
            {title}
          </h1>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-line">
          <ViewToggle view={view} filters={filters} basePath={basePath} />
          <div className="flex flex-wrap items-center gap-2 pb-1.5">
            <IncidentFiltersBar
              filters={effectiveFilters}
              showStatus={view === "list"}
            />
            <NewIncidentSheet
              profiles={profiles}
              projects={projects}
              defaultProjectId={project?.id}
            />
          </div>
        </div>
      </header>

      <div className="hidden sm:block">
        <Suspense fallback={<SeverityStatsSkeleton />}>
          <SeverityStats view={view} basePath={basePath} projectId={project?.id} />
        </Suspense>
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
