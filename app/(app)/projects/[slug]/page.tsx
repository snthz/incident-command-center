import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { IncidentsView } from "@/features/incidents/incidents-view";
import { getProject } from "@/features/incidents/queries";

export async function generateMetadata({
  params,
}: PageProps<"/projects/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);
  return {
    title: project
      ? `${project.name} — Incident Command Center`
      : "Project not found",
  };
}

export default async function ProjectPage({
  params,
  searchParams,
}: PageProps<"/projects/[slug]">) {
  await requireUser();
  const [{ slug }, query] = await Promise.all([params, searchParams]);

  const project = await getProject(slug);
  if (!project) notFound();

  return (
    <IncidentsView
      searchParams={query}
      basePath={`/projects/${project.slug}`}
      project={project}
      title={project.name}
      description={`Incidents in ${project.name} (${project.keyPrefix}-*). Resolved shows the last 7 days.`}
    />
  );
}
