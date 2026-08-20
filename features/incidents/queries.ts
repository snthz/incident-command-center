import "server-only";
import { prisma } from "@/lib/prisma";
import type { IncidentFilters } from "./schema";

export const RESOLVED_WINDOW_DAYS = 7;
const STATS_STREAM_DELAY_MS = 900;

const incidentListInclude = {
  owner: true,
  _count: { select: { updates: true } },
} as const;

export type IncidentListItem = Awaited<
  ReturnType<typeof getActiveIncidents>
>[number];

export async function getActiveIncidents(filters: IncidentFilters) {
  return prisma.incident.findMany({
    where: {
      status: filters.status ?? { not: "resolved" },
      severity: filters.severity,
    },
    include: incidentListInclude,
    orderBy: { updatedAt: "desc" },
  });
}

export async function getRecentlyResolved(filters: IncidentFilters) {
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - RESOLVED_WINDOW_DAYS);

  return prisma.incident.findMany({
    where: {
      status: "resolved",
      resolvedAt: { gte: windowStart },
      severity: filters.severity,
    },
    include: incidentListInclude,
    orderBy: { resolvedAt: "desc" },
  });
}

export async function getSeverityStats() {
  await new Promise((resolve) => setTimeout(resolve, STATS_STREAM_DELAY_MS));

  const groups = await prisma.incident.groupBy({
    by: ["severity"],
    where: { status: { not: "resolved" } },
    _count: { _all: true },
  });

  return Object.fromEntries(
    groups.map((group) => [group.severity, group._count._all]),
  ) as Partial<Record<IncidentListItem["severity"], number>>;
}
