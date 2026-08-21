import "server-only";
import { prisma } from "@/lib/prisma";
import type { NotificationType } from "./service";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  incidentKey: string;
  incidentTitle: string;
  actorName: string | null;
  createdAt: string;
  read: boolean;
};

export async function getNotifications(userId: string): Promise<{
  items: NotificationItem[];
  unread: number;
}> {
  const [rows, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { recipientId: userId },
      include: { actor: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.notification.count({
      where: { recipientId: userId, readAt: null },
    }),
  ]);

  return {
    items: rows.map((row) => ({
      id: row.id,
      type: row.type as NotificationType,
      incidentKey: row.incidentKey,
      incidentTitle: row.incidentTitle,
      actorName: row.actor?.name ?? null,
      createdAt: row.createdAt.toISOString(),
      read: row.readAt !== null,
    })),
    unread,
  };
}
