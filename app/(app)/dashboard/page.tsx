import type { Metadata } from "next";
import { requireUser } from "@/lib/dal";
import { IncidentsView } from "@/features/incidents/incidents-view";

export const metadata: Metadata = { title: "Overview — Incident Command Center" };

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  await requireUser();
  const params = await searchParams;

  return (
    <IncidentsView
      searchParams={params}
      basePath="/dashboard"
      title="Overview"
      description="Every incident across the organization. Resolved shows the last 7 days."
    />
  );
}
