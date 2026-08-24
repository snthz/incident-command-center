import { Skeleton } from "@/components/ui/skeleton";
import { getUser } from "@/lib/dal";
import { ActivityTabs } from "./activity-tabs";
import { getIncidentEvents, getIncidentUpdates } from "./queries";

export async function ActivityFeed({ incidentId }: { incidentId: string }) {
  const [updates, events, user] = await Promise.all([
    getIncidentUpdates(incidentId),
    getIncidentEvents(incidentId),
    getUser(),
  ]);
  if (!user) return null;

  return (
    <ActivityTabs
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
        editedAt: update.editedAt,
        author: update.author
          ? { id: update.author.id, name: update.author.name }
          : null,
        attachments: update.attachments.map((attachment) => ({
          id: attachment.id,
          fileName: attachment.fileName,
          filePath: attachment.filePath,
          mimeType: attachment.mimeType,
          sizeBytes: Number(attachment.sizeBytes),
        })),
      }))}
      initialEvents={events.map((event) => ({
        id: event.id,
        type: event.type,
        fromValue: event.fromValue,
        toValue: event.toValue,
        actorName: event.actor?.name ?? null,
        createdAt: event.createdAt.toISOString(),
      }))}
    />
  );
}

export function ActivityFeedSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-6">
      <div className="flex items-center gap-1">
        <Skeleton className="h-8 w-40" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-11 w-full" />
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
