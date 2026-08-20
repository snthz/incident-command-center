import { Skeleton } from "@/components/ui/skeleton";
import { getUser } from "@/lib/dal";
import { LiveFeed } from "./live-feed";
import { getIncidentUpdates } from "./queries";

export async function ActivityFeed({ incidentId }: { incidentId: string }) {
  const [updates, user] = await Promise.all([
    getIncidentUpdates(incidentId),
    getUser(),
  ]);
  if (!user) return null;

  return (
    <LiveFeed
      incidentId={incidentId}
      currentUser={{
        id: user.id,
        name:
          (user.user_metadata?.name as string | undefined) ??
          user.email ??
          "You",
      }}
      initialUpdates={updates.map((update) => ({
        id: update.id,
        message: update.message,
        createdAt: update.createdAt,
        author: update.author
          ? { id: update.author.id, name: update.author.name }
          : null,
      }))}
    />
  );
}

export function ActivityFeedSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-24 w-full" />
      </div>
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
