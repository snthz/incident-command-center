import "server-only";
import { prisma } from "@/lib/prisma";

export type NotificationType = "update_posted" | "status_changed" | "assigned";

export async function notify(input: {
  recipientId: string | null | undefined;
  actorId: string;
  incident: { id: string; key: string; title: string };
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
