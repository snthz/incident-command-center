"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/dal";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { notify } from "@/features/notifications/service";
import {
  assignIncidentSchema,
  createIncidentSchema,
  moveIncidentSchema,
  postUpdateSchema,
  reorderIncidentSchema,
} from "./schema";
import { z } from "zod";

export type MoveIncidentResult = { error?: string };

const SESSION_EXPIRED = "Your session has expired. Sign in again.";

type DropTarget = z.infer<typeof reorderIncidentSchema>;
type IncidentStatus = DropTarget["status"];

function revalidateBoard() {
  revalidatePath("/dashboard");
  revalidatePath("/incidents/[key]", "page");
}

/** Position just past the last card of a column, so the incident lands at the bottom. */
async function endOfColumn(
  tx: Prisma.TransactionClient,
  status: IncidentStatus,
  excludeId: string,
) {
  const last = await tx.incident.findFirst({
    where: { status, id: { not: excludeId } },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  return last ? last.position + 1 : 0;
}

async function neighbourPosition(
  tx: Prisma.TransactionClient,
  neighbourId: string | null | undefined,
  status: IncidentStatus,
  movingId: string,
) {
  if (!neighbourId || neighbourId === movingId) return null;
  const neighbour = await tx.incident.findFirst({
    where: { id: neighbourId, status },
    select: { position: true },
  });
  return neighbour?.position ?? null;
}

/**
 * Fractional position for the drop slot, or null when the gap between the two
 * neighbours can no longer be split (float precision ran out, or the client
 * sent a stale pair) — the caller renumbers the column instead.
 */
async function dropPosition(
  tx: Prisma.TransactionClient,
  { id, status, beforeId, afterId }: DropTarget,
) {
  const before = await neighbourPosition(tx, beforeId, status, id);
  const after = await neighbourPosition(tx, afterId, status, id);

  if (before !== null && after !== null) {
    const position = (before + after) / 2;
    return position > before && position < after ? position : null;
  }
  if (before !== null) return before + 1;
  if (after !== null) return after - 1;
  return endOfColumn(tx, status, id);
}

function anchorIndex(
  ids: string[],
  beforeId: string | null | undefined,
  afterId: string | null | undefined,
) {
  if (beforeId) {
    const index = ids.indexOf(beforeId);
    if (index >= 0) return index + 1;
  }
  if (afterId) {
    const index = ids.indexOf(afterId);
    if (index >= 0) return index;
  }
  return ids.length;
}

/** Rare fallback: renumber the destination column 0..n with the card in its slot. */
async function rebalanceColumn(
  tx: Prisma.TransactionClient,
  { id, status, beforeId, afterId }: DropTarget,
) {
  const rows = await tx.incident.findMany({
    where: { status },
    orderBy: [{ position: "asc" }, { updatedAt: "desc" }],
    select: { id: true },
  });

  const ids = rows.map((row) => row.id).filter((rowId) => rowId !== id);
  ids.splice(anchorIndex(ids, beforeId, afterId), 0, id);

  for (const [index, rowId] of ids.entries()) {
    await tx.incident.update({
      where: { id: rowId },
      data: rowId === id ? { status, position: index } : { position: index },
    });
  }
}

export async function reorderIncident(input: {
  id: string;
  status: string;
  beforeId?: string | null;
  afterId?: string | null;
}): Promise<MoveIncidentResult> {
  const user = await getUser();
  if (!user) {
    return { error: SESSION_EXPIRED };
  }

  const parsed = reorderIncidentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "That move is not valid." };
  }

  const target = parsed.data;
  let moved: { id: string; key: string; title: string; ownerId: string | null; changed: boolean } | null = null;

  try {
    moved = await prisma.$transaction(async (tx) => {
      const current = await tx.incident.findUniqueOrThrow({
        where: { id: target.id },
        select: { id: true, key: true, title: true, ownerId: true, status: true },
      });
      const position = await dropPosition(tx, target);
      if (position === null) {
        await rebalanceColumn(tx, target);
      } else {
        await tx.incident.update({
          where: { id: target.id },
          data: { status: target.status, position },
        });
      }
      return { ...current, changed: current.status !== target.status };
    });
  } catch {
    return { error: "Could not move the incident. Try again." };
  }

  if (moved.changed) {
    await notify({
      recipientId: moved.ownerId,
      actorId: user.id,
      incident: moved,
      type: "status_changed",
    });
  }

  revalidateBoard();
  return {};
}

export async function updateIncidentStatus(input: {
  id: string;
  status: string;
}): Promise<MoveIncidentResult> {
  const user = await getUser();
  if (!user) {
    return { error: SESSION_EXPIRED };
  }

  const parsed = moveIncidentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "That status change is not valid." };
  }

  let updated: { id: string; key: string; title: string; ownerId: string | null; changed: boolean } | null = null;

  try {
    updated = await prisma.$transaction(async (tx) => {
      const { id, status } = parsed.data;
      const current = await tx.incident.findUniqueOrThrow({
        where: { id },
        select: { status: true },
      });
      // Status changed from outside the board (the select): land at the bottom
      // of the new column rather than keeping the old column's position.
      const row = await tx.incident.update({
        where: { id },
        data: { status, position: await endOfColumn(tx, status, id) },
        select: { id: true, key: true, title: true, ownerId: true },
      });
      return { ...row, changed: current.status !== status };
    });
  } catch {
    return { error: "Could not update the incident. Try again." };
  }

  if (updated.changed) {
    await notify({
      recipientId: updated.ownerId,
      actorId: user.id,
      incident: updated,
      type: "status_changed",
    });
  }

  revalidateBoard();
  return {};
}

export async function postIncidentUpdate(input: {
  id: string;
  incidentId: string;
  message: string;
}): Promise<{ error?: string }> {
  const user = await getUser();
  if (!user) {
    return { error: SESSION_EXPIRED };
  }

  const parsed = postUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "The update message is not valid." };
  }

  let incident: { id: string; key: string; title: string; ownerId: string | null } | null = null;

  try {
    const created = await prisma.incidentUpdate.create({
      data: {
        id: parsed.data.id,
        incidentId: parsed.data.incidentId,
        authorId: user.id,
        message: parsed.data.message,
      },
      include: {
        incident: {
          select: { id: true, key: true, title: true, ownerId: true },
        },
      },
    });
    incident = created.incident;
  } catch {
    return { error: "Could not post the update. Try again." };
  }

  await notify({
    recipientId: incident.ownerId,
    actorId: user.id,
    incident,
    type: "update_posted",
  });

  revalidateBoard();
  return {};
}

export type CreateIncidentState = {
  error?: string;
  fieldErrors?: {
    title?: string;
    description?: string;
    severity?: string;
  };
  createdKey?: string;
};

export async function createIncident(
  _prev: CreateIncidentState,
  formData: FormData,
): Promise<CreateIncidentState> {
  const user = await getUser();
  if (!user) {
    return { error: SESSION_EXPIRED };
  }

  const parsed = createIncidentSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    severity: formData.get("severity"),
    ownerId: formData.get("ownerId") ?? "",
  });

  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    return {
      fieldErrors: {
        title: fieldErrors.title?.[0],
        description: fieldErrors.description?.[0],
        severity: fieldErrors.severity?.[0],
      },
    };
  }

  let incident: { id: string; key: string; title: string; ownerId: string | null } | null = null;

  try {
    incident = await prisma.$transaction(async (tx) => {
      const first = await tx.incident.findFirst({
        where: { status: "investigating" },
        orderBy: { position: "asc" },
        select: { position: true },
      });
      return tx.incident.create({
        data: {
          title: parsed.data.title,
          description: parsed.data.description,
          severity: parsed.data.severity,
          ownerId: parsed.data.ownerId,
          position: first ? first.position - 1 : 0,
        },
        select: { id: true, key: true, title: true, ownerId: true },
      });
    });
  } catch {
    return { error: "Could not create the incident. Try again." };
  }

  await notify({
    recipientId: incident.ownerId,
    actorId: user.id,
    incident,
    type: "assigned",
  });

  revalidateBoard();
  return { createdKey: incident.key };
}

export async function assignIncident(input: {
  id: string;
  ownerId: string;
}): Promise<MoveIncidentResult> {
  const user = await getUser();
  if (!user) {
    return { error: SESSION_EXPIRED };
  }

  const parsed = assignIncidentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "That assignment is not valid." };
  }

  let incident: { id: string; key: string; title: string; ownerId: string | null } | null = null;

  try {
    incident = await prisma.incident.update({
      where: { id: parsed.data.id },
      data: { ownerId: parsed.data.ownerId },
      select: { id: true, key: true, title: true, ownerId: true },
    });
  } catch {
    return { error: "Could not change the assignee. Try again." };
  }

  await notify({
    recipientId: incident.ownerId,
    actorId: user.id,
    incident,
    type: "assigned",
  });

  revalidateBoard();
  return {};
}
