import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { IncidentFilters } from "./schema";

export const RESOLVED_WINDOW_DAYS = 7;
const STATS_STREAM_DELAY_MS = 900;
const FEED_STREAM_DELAY_MS = 1200;

const incidentListInclude = {
  owner: true,
  _count: { select: { updates: true } },
} as const;

function searchClause(q: string | undefined) {
  if (!q) return {};
  return {
    OR: [
      { title: { contains: q, mode: "insensitive" as const } },
      { description: { contains: q, mode: "insensitive" as const } },
    ],
  };
}

export type IncidentListItem = Awaited<
  ReturnType<typeof getActiveIncidents>
>[number];

/**
 * "board" honours the manual drag-and-drop order; "recent" is the activity
 * order the flat list view reads by (its own column says "Last updated").
 */
export type IncidentOrder = "board" | "recent";

export async function getActiveIncidents(
  filters: IncidentFilters,
  order: IncidentOrder = "recent",
) {
  return prisma.incident.findMany({
    where: {
      status: filters.status ?? { not: "resolved" },
      severity: filters.severity,
      ...searchClause(filters.q),
    },
    include: incidentListInclude,
    orderBy:
      order === "board"
        ? [{ position: "asc" }, { updatedAt: "desc" }]
        : [{ updatedAt: "desc" }],
  });
}

export async function getRecentlyResolved(
  filters: IncidentFilters,
  order: IncidentOrder = "recent",
) {
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - RESOLVED_WINDOW_DAYS);

  return prisma.incident.findMany({
    where: {
      status: "resolved",
      resolvedAt: { gte: windowStart },
      severity: filters.severity,
      ...searchClause(filters.q),
    },
    include: incidentListInclude,
    orderBy:
      order === "board"
        ? [{ position: "asc" }, { resolvedAt: "desc" }]
        : [{ resolvedAt: "desc" }],
  });
}

export const getProfiles = cache(async () => {
  return prisma.profile.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
});

export type ProfileOption = Awaited<ReturnType<typeof getProfiles>>[number];

export const getIncident = cache(async (key: string) => {
  return prisma.incident.findUnique({
    where: { key: key.toUpperCase() },
    include: { owner: true },
  });
});

export type IncidentDetail = NonNullable<Awaited<ReturnType<typeof getIncident>>>;

export async function getIncidentUpdates(incidentId: string) {
  await new Promise((resolve) => setTimeout(resolve, FEED_STREAM_DELAY_MS));

  return prisma.incidentUpdate.findMany({
    where: { incidentId },
    include: { author: true },
    orderBy: { createdAt: "desc" },
  });
}

export type IncidentUpdateItem = Awaited<
  ReturnType<typeof getIncidentUpdates>
>[number];

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
