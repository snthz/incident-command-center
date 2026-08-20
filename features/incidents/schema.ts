import { z } from "zod";
import { IncidentSeverity, IncidentStatus } from "@/lib/generated/prisma/enums";

export const severityValues = Object.values(IncidentSeverity);
export const statusValues = Object.values(IncidentStatus);

function toLabel(value: string) {
  return value[0].toUpperCase() + value.slice(1);
}

export const severityLabels = Object.fromEntries(
  severityValues.map((value) => [value, toLabel(value)]),
) as Record<IncidentSeverity, string>;

export const statusLabels = Object.fromEntries(
  statusValues.map((value) => [value, toLabel(value)]),
) as Record<IncidentStatus, string>;

export const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const incidentFiltersSchema = z.object({
  status: z.enum(IncidentStatus).optional().catch(undefined),
  severity: z.enum(IncidentSeverity).optional().catch(undefined),
  q: z.string().trim().min(1).max(120).optional().catch(undefined),
});

export type IncidentFilters = z.infer<typeof incidentFiltersSchema>;

export function parseIncidentFilters(
  params: Record<string, string | string[] | undefined>,
): IncidentFilters {
  return incidentFiltersSchema.parse({
    status: params.status,
    severity: params.severity,
    q: params.q,
  });
}

export const dashboardViews = ["board", "list"] as const;
export type DashboardView = (typeof dashboardViews)[number];

export function parseDashboardView(
  value: string | string[] | undefined,
): DashboardView {
  return value === "list" ? "list" : "board";
}

export const moveIncidentSchema = z.object({
  id: z.string().regex(uuidPattern),
  status: z.enum(IncidentStatus),
});
