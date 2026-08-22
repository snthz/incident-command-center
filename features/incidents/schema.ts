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

export const incidentKeyPattern = /^[a-z]{2,10}-\d{1,6}$/i;

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

export const postUpdateSchema = z.object({
  id: z.string().regex(uuidPattern),
  incidentId: z.string().regex(uuidPattern),
  message: z.string().trim().min(1).max(2000),
});

export const createIncidentSchema = z.object({
  projectId: z.string().regex(uuidPattern, "Pick a project."),
  title: z
    .string()
    .trim()
    .min(8, "Give it a descriptive title (at least 8 characters).")
    .max(150, "Keep the title under 150 characters."),
  description: z
    .string()
    .trim()
    .min(20, "Describe the impact and what is failing (at least 20 characters).")
    .max(5000, "Keep the description under 5,000 characters."),
  severity: z.enum(IncidentSeverity, "Pick a severity."),
  ownerId: z
    .union([z.string().regex(uuidPattern), z.literal("")])
    .transform((value) => (value === "" ? null : value)),
  dueDate: z
    .union([
      z.literal(""),
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid due date."),
    ])
    .transform((value) =>
      value === "" ? null : new Date(`${value}T12:00:00Z`),
    ),
});

export const editIncidentSchema = z
  .object({
    id: z.string().regex(uuidPattern),
    title: z
      .string()
      .trim()
      .min(8, "Give it a descriptive title (at least 8 characters).")
      .max(150, "Keep the title under 150 characters.")
      .optional(),
    description: z
      .string()
      .trim()
      .min(20, "Describe the impact and what is failing (at least 20 characters).")
      .max(5000, "Keep the description under 5,000 characters.")
      .optional(),
  })
  .refine((data) => data.title !== undefined || data.description !== undefined);

export const setDueDateSchema = z.object({
  id: z.string().regex(uuidPattern),
  dueDate: z
    .union([
      z.literal(""),
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid due date."),
    ])
    .transform((value) =>
      value === "" ? null : new Date(`${value}T12:00:00Z`),
    ),
});

export const watchIncidentSchema = z.object({
  incidentId: z.string().regex(uuidPattern),
  watch: z.boolean(),
});

export const assignIncidentSchema = z.object({
  id: z.string().regex(uuidPattern),
  ownerId: z
    .union([z.string().regex(uuidPattern), z.literal("")])
    .transform((value) => (value === "" ? null : value)),
});

// Drop target expressed as the two cards the incident lands between.
// Neighbour ids instead of a full ordered list: the board renders filtered,
// so a full list would overwrite the position of cards hidden by a filter.
export const reorderIncidentSchema = z.object({
  id: z.string().regex(uuidPattern),
  status: z.enum(IncidentStatus),
  beforeId: z.string().regex(uuidPattern).nullish(),
  afterId: z.string().regex(uuidPattern).nullish(),
});
