import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TimeAgo } from "@/components/ui/time-ago";
import { requireUser } from "@/lib/dal";
import { ActivityFeed, ActivityFeedSkeleton } from "@/features/incidents/activity-feed";
import { SeverityBadge } from "@/features/incidents/badges";
import { FeedErrorBoundary } from "@/features/incidents/feed-error-boundary";
import { OwnerSelect } from "@/features/incidents/owner-select";
import { getIncident, getProfiles } from "@/features/incidents/queries";
import { incidentKeyPattern } from "@/features/incidents/schema";
import { StatusSelect } from "@/features/incidents/status-select";

export async function generateMetadata({
  params,
}: PageProps<"/incidents/[key]">): Promise<Metadata> {
  const { key } = await params;
  if (!incidentKeyPattern.test(key)) return { title: "Incident not found" };
  const incident = await getIncident(key);
  return {
    title: incident
      ? `[${incident.key}] ${incident.title}`
      : "Incident not found",
  };
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-center gap-3 px-4 py-2.5">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="text-sm text-neutral-300">{children}</dd>
    </div>
  );
}

export default async function IncidentDetailPage({ params }: PageProps<"/incidents/[key]">) {
  await requireUser();
  const { key } = await params;
  if (!incidentKeyPattern.test(key)) notFound();

  const [incident, profiles] = await Promise.all([getIncident(key), getProfiles()]);
  if (!incident) notFound();

  return (
    <article className="flex flex-col gap-5">
      <nav
        aria-label="Breadcrumb"
        className="sticky top-0 z-20 -mx-4 flex items-center gap-1.5 bg-surface/95 px-4 py-3 text-sm backdrop-blur-sm"
      >
        <Link
          href={`/projects/${incident.project.slug}`}
          className="flex items-center gap-1.5 text-muted hover:text-foreground"
        >
          <span
            aria-hidden
            className="size-2 rounded-full"
            style={{ backgroundColor: incident.project.color }}
          />
          {incident.project.name}
        </Link>
        <span aria-hidden className="text-neutral-600">/</span>
        <span className="font-mono text-xs text-muted">{incident.key}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-8">
          <h1 className="text-2xl font-semibold text-foreground">{incident.title}</h1>

          <section aria-label="Description">
            <h2 className="mb-2 text-sm font-semibold text-foreground">Description</h2>
            <p className="max-w-3xl text-sm leading-relaxed text-neutral-300">
              {incident.description}
            </p>
          </section>

          <section aria-label="Activity" className="min-w-0">
            <h2 className="mb-4 text-sm font-semibold text-foreground">Activity</h2>
            <FeedErrorBoundary>
              <Suspense fallback={<ActivityFeedSkeleton />}>
                <ActivityFeed incidentId={incident.id} />
              </Suspense>
            </FeedErrorBoundary>
          </section>
        </div>

        <aside
          aria-label="Incident details"
          className="flex h-fit flex-col gap-4 lg:sticky lg:top-14"
        >
          <div className="w-fit">
            <StatusSelect
              incidentId={incident.id}
              incidentKey={incident.key}
              status={incident.status}
            />
          </div>

          <div className="rounded-lg border border-line">
            <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-foreground">
              Details
            </h2>
            <dl className="flex flex-col divide-y divide-line">
              <DetailRow label="Assignee">
                <div className="-ml-2">
                  <OwnerSelect
                    incidentId={incident.id}
                    incidentKey={incident.key}
                    ownerId={incident.ownerId}
                    profiles={profiles}
                    align="end"
                  />
                </div>
              </DetailRow>
              <DetailRow label="Severity">
                <SeverityBadge severity={incident.severity} />
              </DetailRow>
              <DetailRow label="Created">
                <TimeAgo date={incident.createdAt} />
              </DetailRow>
              <DetailRow label="Last updated">
                <TimeAgo date={incident.updatedAt} />
              </DetailRow>
              {incident.resolvedAt ? (
                <DetailRow label="Resolved">
                  <TimeAgo date={incident.resolvedAt} />
                </DetailRow>
              ) : null}
            </dl>
          </div>
        </aside>
      </div>
    </article>
  );
}
