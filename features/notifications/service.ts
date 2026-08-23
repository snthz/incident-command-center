import "server-only";
import { prisma } from "@/lib/prisma";

export type NotificationType = "update_posted" | "status_changed" | "assigned";

type IncidentRef = {
  id: string;
  key: string;
  title: string;
  ownerId?: string | null;
};

export async function notify(input: {
  recipientId: string | null | undefined;
  actorId: string;
  incident: IncidentRef;
  type: NotificationType;
}) {
  if (!input.recipientId || input.recipientId === input.actorId) return;
  try {
    await prisma.notification.create({
      data: {
        recipientId: input.recipientId,
        actorId: input.actorId,
        incidentId: input.incident.id,
        incidentKey: input.incident.key,
        incidentTitle: input.incident.title,
        type: input.type,
      },
    });
  } catch {}
}

export async function notifyWatchers(input: {
  actorId: string;
  incident: IncidentRef;
  type: NotificationType;
}) {
  try {
    const watchers = await prisma.incidentWatcher.findMany({
      where: { incidentId: input.incident.id },
      select: { profileId: true },
    });
    const recipients = new Set(watchers.map((watcher) => watcher.profileId));
    if (input.incident.ownerId) recipients.add(input.incident.ownerId);
    recipients.delete(input.actorId);
    if (recipients.size === 0) return;
    await prisma.notification.createMany({
      data: [...recipients].map((recipientId) => ({
        recipientId,
        actorId: input.actorId,
        incidentId: input.incident.id,
        incidentKey: input.incident.key,
        incidentTitle: input.incident.title,
        type: input.type,
      })),
    });
  } catch {}
}

export type IncidentEventType =
  | "created"
  | "status_changed"
  | "assignee_changed"
  | "due_date_changed"
  | "title_edited"
  | "description_edited"
  | "attachment_added"
  | "attachment_removed";

export async function logEvent(input: {
  incidentId: string;
  actorId: string;
  type: IncidentEventType;
  fromValue?: string | null;
  toValue?: string | null;
}) {
  try {
    await prisma.incidentEvent.create({
      data: {
        incidentId: input.incidentId,
        actorId: input.actorId,
        type: input.type,
        fromValue: input.fromValue ?? null,
        toValue: input.toValue ?? null,
      },
    });
  } catch {}
}

export async function addWatcher(incidentId: string, profileId: string) {
  try {
    await prisma.incidentWatcher.createMany({
      data: [{ incidentId, profileId }],
      skipDuplicates: true,
    });
  } catch {}
}

export async function removeWatcher(incidentId: string, profileId: string) {
  try {
    await prisma.incidentWatcher.deleteMany({
      where: { incidentId, profileId },
    });
  } catch {}
}
