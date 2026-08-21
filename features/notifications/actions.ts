"use server";

import { z } from "zod";
import { getUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { uuidPattern } from "@/features/incidents/schema";

const idSchema = z.string().regex(uuidPattern);

export async function markNotificationRead(id: string) {
  const user = await getUser();
  if (!user) return;

  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return;

  try {
    await prisma.notification.updateMany({
      where: { id: parsed.data, recipientId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
  } catch {}
}

export async function markAllNotificationsRead() {
  const user = await getUser();
  if (!user) return;

  try {
    await prisma.notification.updateMany({
      where: { recipientId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
  } catch {}
}
