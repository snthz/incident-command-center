import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { TimeAgo } from "@/components/ui/time-ago";
import { getIncidentUpdates, type IncidentUpdateItem } from "./queries";

function AuthorAvatar({ author }: { author: IncidentUpdateItem["author"] }) {
  const initials = author
    ? author.name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  return (
    <span
      aria-hidden
      className="z-10 flex size-7 shrink-0 items-center justify-center rounded-full border border-line bg-surface-2 text-[10px] font-semibold text-neutral-300"
    >
      {initials}
    </span>
  );
}

export async function ActivityFeed({ incidentId }: { incidentId: string }) {
  const updates = await getIncidentUpdates(incidentId);

  if (updates.length === 0) {
    return (
      <EmptyState
        title="No updates yet"
        description="Activity will appear here as the team posts updates."
      />
    );
  }

  return (
    <ol aria-label="Incident updates" className="flex flex-col">
      {updates.map((update, index) => (
        <li key={update.id} className="relative flex gap-3 pb-6 last:pb-0">
          {index < updates.length - 1 ? (
            <span
              aria-hidden
              className="absolute left-3.5 top-7 h-full w-px bg-line"
            />
          ) : null}
          <AuthorAvatar author={update.author} />
          <div className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
            <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
              <span className="font-medium text-foreground">
                {update.author?.name ?? "Former member"}
              </span>
              <TimeAgo date={update.createdAt} className="text-xs text-muted" />
            </p>
            <p className="text-sm leading-relaxed text-neutral-300">
              {update.message}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function ActivityFeedSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-6">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex gap-3">
          <Skeleton className="size-7 rounded-full" />
          <div className="flex flex-1 flex-col gap-2 pt-0.5">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3.5 w-full max-w-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
