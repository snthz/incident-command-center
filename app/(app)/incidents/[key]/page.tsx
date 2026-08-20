import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { SeverityBadge, StatusBadge } from "@/features/incidents/badges";
import { uuidPattern } from "@/features/incidents/schema";

export default async function IncidentDetailPage({ params }: PageProps<"/incidents/[id]">) {
  await requireUser();
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();

  const incident = await prisma.incident.findUnique({ where: { id } });
  if (!incident) notFound();

  return (
    <article className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge severity={incident.severity} />
        <StatusBadge status={incident.status} />
      </div>
      <h1 className="text-xl font-semibold text-foreground">{incident.title}</h1>
      <p className="text-sm text-muted">{incident.description}</p>
      <p className="rounded-md border border-dashed border-line px-4 py-3 text-sm text-muted">
        Full incident detail with activity feed lands in Phase 4.
      </p>
    </article>
  );
}
