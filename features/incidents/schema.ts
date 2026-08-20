import { z } from "zod";
import { IncidentSeverity, IncidentStatus } from "@/lib/generated/prisma/enums";

export const severityValues = Object.values(IncidentSeverity);
export const statusValues = Object.values(IncidentStatus);

export const incidentFiltersSchema = z.object({
  status: z.enum(IncidentStatus).optional().catch(undefined),
  severity: z.enum(IncidentSeverity).optional().catch(undefined),
});

export type IncidentFilters = z.infer<typeof incidentFiltersSchema>;

export function parseIncidentFilters(
  params: Record<string, string | string[] | undefined>,
): IncidentFilters {
  return incidentFiltersSchema.parse({
    status: params.status,
    severity: params.severity,
  });
}
