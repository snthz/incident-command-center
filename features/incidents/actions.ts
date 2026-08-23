"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/dal";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  addWatcher,
  logEvent,
  notify,
  notifyWatchers,
  removeWatcher,
} from "@/features/notifications/service";
import { createClient } from "@/lib/supabase/server";
import {
  addAttachmentSchema,
  assignIncidentSchema,
  createIncidentSchema,
  deleteUpdateSchema,
  editIncidentSchema,
  editUpdateSchema,
  moveIncidentSchema,
  postUpdateSchema,
  removeAttachmentSchema,
  reorderIncidentSchema,
  setDueDateSchema,
  watchIncidentSchema,
  type AttachmentMeta,
} from "./schema";
import { z } from "zod";

export type MoveIncidentResult = { error?: string };

const SESSION_EXPIRED = "Your session has expired. Sign in again.";

type DropTarget = z.infer<typeof reorderIncidentSchema>;
type IncidentStatus = DropTarget["status"];

function revalidateBoard() {
  revalidatePath("/dashboard");
  revalidatePath("/projects/[slug]", "page");
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
  let moved: { id: string; key: string; title: string; ownerId: string | null; status: string; changed: boolean } | null = null;

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
    await logEvent({
      incidentId: moved.id,
      actorId: user.id,
      type: "status_changed",
      fromValue: moved.status,
      toValue: target.status,
    });
    await notifyWatchers({
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

  let updated: { id: string; key: string; title: string; ownerId: string | null; fromStatus: string; changed: boolean } | null = null;

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
      return { ...row, fromStatus: current.status, changed: current.status !== status };
    });
  } catch {
    return { error: "Could not update the incident. Try again." };
  }

  if (updated.changed) {
    await logEvent({
      incidentId: updated.id,
      actorId: user.id,
      type: "status_changed",
      fromValue: updated.fromStatus,
      toValue: parsed.data.status,
    });
    await notifyWatchers({
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
  attachments?: AttachmentMeta[];
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

    if (parsed.data.attachments?.length) {
      await prisma.incidentAttachment.createMany({
        data: parsed.data.attachments.map((attachment) => ({
          incidentId: parsed.data.incidentId,
          updateId: parsed.data.id,
          uploaderId: user.id,
          fileName: attachment.fileName,
          filePath: attachment.filePath,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.sizeBytes,
        })),
      });
    }
  } catch {
    return { error: "Could not post the update. Try again." };
  }

  await addWatcher(incident.id, user.id);
  await notifyWatchers({
    actorId: user.id,
    incident,
    type: "update_posted",
  });

  revalidateBoard();
  return {};
}

// Comments are owned: only the author may edit or delete them. Prisma runs
// privileged, so the ownership check lives here rather than in RLS.
export async function editIncidentUpdate(input: {
  id: string;
  message: string;
}): Promise<{ error?: string }> {
  const user = await getUser();
  if (!user) {
    return { error: SESSION_EXPIRED };
  }

  const parsed = editUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "The comment is not valid." };
  }

  try {
    const existing = await prisma.incidentUpdate.findUnique({
      where: { id: parsed.data.id },
      select: { authorId: true },
    });
    if (!existing) {
      return { error: "That comment no longer exists." };
    }
    if (existing.authorId !== user.id) {
      return { error: "Only the author can edit this comment." };
    }
    await prisma.incidentUpdate.update({
      where: { id: parsed.data.id },
      data: { message: parsed.data.message, editedAt: new Date() },
    });
  } catch {
    return { error: "Could not edit the comment. Try again." };
  }

  revalidateBoard();
  return {};
}

export async function deleteIncidentUpdate(input: {
  id: string;
}): Promise<{ error?: string }> {
  const user = await getUser();
  if (!user) {
    return { error: SESSION_EXPIRED };
  }

  const parsed = deleteUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "That comment is not valid." };
  }

  let filePaths: string[] = [];
  try {
    const existing = await prisma.incidentUpdate.findUnique({
      where: { id: parsed.data.id },
      select: {
        authorId: true,
        attachments: { select: { filePath: true } },
      },
    });
    if (!existing) {
      revalidateBoard();
      return {};
    }
    if (existing.authorId !== user.id) {
      return { error: "Only the author can delete this comment." };
    }
    filePaths = existing.attachments.map((attachment) => attachment.filePath);
    await prisma.incidentUpdate.delete({ where: { id: parsed.data.id } });
  } catch {
    return { error: "Could not delete the comment. Try again." };
  }

  // Attachment rows cascade with the update; files are best-effort cleanup.
  if (filePaths.length) {
    try {
      const supabase = await createClient();
      await supabase.storage.from("attachments").remove(filePaths);
    } catch {}
  }

  revalidateBoard();
  return {};
}

export async function addIncidentAttachment(input: {
  incidentId: string;
  attachment: AttachmentMeta;
}): Promise<{ error?: string; id?: string }> {
  const user = await getUser();
  if (!user) {
    return { error: SESSION_EXPIRED };
  }

  const parsed = addAttachmentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "That file is not valid." };
  }

  let created: { id: string };
  try {
    created = await prisma.incidentAttachment.create({
      data: {
        incidentId: parsed.data.incidentId,
        uploaderId: user.id,
        fileName: parsed.data.attachment.fileName,
        filePath: parsed.data.attachment.filePath,
        mimeType: parsed.data.attachment.mimeType,
        sizeBytes: parsed.data.attachment.sizeBytes,
      },
      select: { id: true },
    });
  } catch {
    return { error: "Could not attach the file. Try again." };
  }

  await logEvent({
    incidentId: parsed.data.incidentId,
    actorId: user.id,
    type: "attachment_added",
    toValue: parsed.data.attachment.fileName,
  });

  revalidateBoard();
  return { id: created.id };
}

export async function removeIncidentAttachment(input: {
  id: string;
}): Promise<{ error?: string }> {
  const user = await getUser();
  if (!user) {
    return { error: SESSION_EXPIRED };
  }

  const parsed = removeAttachmentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "That attachment is not valid." };
  }

  let removed: { incidentId: string; filePath: string; fileName: string };
  try {
    const existing = await prisma.incidentAttachment.findUnique({
      where: { id: parsed.data.id },
      select: { updateId: true, uploaderId: true },
    });
    if (!existing) {
      return { error: "That attachment no longer exists." };
    }
    // Description files are shared; files on a comment belong to its author.
    if (existing.updateId && existing.uploaderId !== user.id) {
      return { error: "Only the author can remove this file." };
    }
    removed = await prisma.incidentAttachment.delete({
      where: { id: parsed.data.id },
      select: { incidentId: true, filePath: true, fileName: true },
    });
  } catch {
    return { error: "Could not remove the attachment. Try again." };
  }

  // Best-effort file cleanup: the metadata row is already gone, an orphaned
  // object in the bucket is harmless.
  try {
    const supabase = await createClient();
    await supabase.storage.from("attachments").remove([removed.filePath]);
  } catch {}

  await logEvent({
    incidentId: removed.incidentId,
    actorId: user.id,
    type: "attachment_removed",
    fromValue: removed.fileName,
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
    projectId: formData.get("projectId"),
    title: formData.get("title"),
    description: formData.get("description"),
    severity: formData.get("severity"),
    ownerId: formData.get("ownerId") ?? "",
    dueDate: formData.get("dueDate") ?? "",
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
      // key and number are omitted on purpose: a BEFORE INSERT trigger
      // assigns them atomically from the project's counter (CORE-8, PAY-3…).
      return tx.incident.create({
        data: {
          projectId: parsed.data.projectId,
          title: parsed.data.title,
          description: parsed.data.description,
          severity: parsed.data.severity,
          ownerId: parsed.data.ownerId,
          dueDate: parsed.data.dueDate,
          position: first ? first.position - 1 : 0,
        },
        select: { id: true, key: true, title: true, ownerId: true },
      });
    });
  } catch {
    return { error: "Could not create the incident. Try again." };
  }

  await logEvent({ incidentId: incident.id, actorId: user.id, type: "created" });
  await addWatcher(incident.id, user.id);
  if (incident.ownerId) await addWatcher(incident.id, incident.ownerId);
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
  let previousOwner: string | null = null;

  try {
    const before = await prisma.incident.findUnique({
      where: { id: parsed.data.id },
      select: { owner: { select: { name: true } } },
    });
    previousOwner = before?.owner?.name ?? null;
    incident = await prisma.incident.update({
      where: { id: parsed.data.id },
      data: { ownerId: parsed.data.ownerId },
      select: {
        id: true,
        key: true,
        title: true,
        ownerId: true,
        owner: { select: { name: true } },
      },
    });
  } catch {
    return { error: "Could not change the assignee. Try again." };
  }

  await logEvent({
    incidentId: incident.id,
    actorId: user.id,
    type: "assignee_changed",
    fromValue: previousOwner,
    toValue:
      (incident as { owner?: { name: string } | null }).owner?.name ?? null,
  });
  if (incident.ownerId) await addWatcher(incident.id, incident.ownerId);
  await notify({
    recipientId: incident.ownerId,
    actorId: user.id,
    incident,
    type: "assigned",
  });

  revalidateBoard();
  return {};
}

export async function editIncidentText(input: {
  id: string;
  title?: string;
  description?: string;
}): Promise<MoveIncidentResult> {
  const user = await getUser();
  if (!user) {
    return { error: SESSION_EXPIRED };
  }

  const parsed = editIncidentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "That change is not valid.",
    };
  }

  let previousTitle: string | null = null;

  try {
    if (parsed.data.title !== undefined) {
      const before = await prisma.incident.findUnique({
        where: { id: parsed.data.id },
        select: { title: true },
      });
      previousTitle = before?.title ?? null;
    }
    await prisma.incident.update({
      where: { id: parsed.data.id },
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
      },
    });
  } catch {
    return { error: "Could not save the change. Try again." };
  }

  if (parsed.data.title !== undefined) {
    await logEvent({
      incidentId: parsed.data.id,
      actorId: user.id,
      type: "title_edited",
      fromValue: previousTitle,
      toValue: parsed.data.title,
    });
  }
  if (parsed.data.description !== undefined) {
    await logEvent({
      incidentId: parsed.data.id,
      actorId: user.id,
      type: "description_edited",
    });
  }

  revalidateBoard();
  return {};
}

export async function setIncidentDueDate(input: {
  id: string;
  dueDate: string;
}): Promise<MoveIncidentResult> {
  const user = await getUser();
  if (!user) {
    return { error: SESSION_EXPIRED };
  }

  const parsed = setDueDateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "That due date is not valid." };
  }

  let previousDueDate: string | null = null;

  try {
    const before = await prisma.incident.findUnique({
      where: { id: parsed.data.id },
      select: { dueDate: true },
    });
    previousDueDate = before?.dueDate?.toISOString().slice(0, 10) ?? null;
    await prisma.incident.update({
      where: { id: parsed.data.id },
      data: { dueDate: parsed.data.dueDate },
    });
  } catch {
    return { error: "Could not update the due date. Try again." };
  }

  await logEvent({
    incidentId: parsed.data.id,
    actorId: user.id,
    type: "due_date_changed",
    fromValue: previousDueDate,
    toValue: parsed.data.dueDate?.toISOString().slice(0, 10) ?? null,
  });

  revalidateBoard();
  return {};
}

export async function toggleWatchIncident(input: {
  incidentId: string;
  watch: boolean;
}): Promise<MoveIncidentResult> {
  const user = await getUser();
  if (!user) {
    return { error: SESSION_EXPIRED };
  }

  const parsed = watchIncidentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "That watch request is not valid." };
  }

  if (parsed.data.watch) {
    await addWatcher(parsed.data.incidentId, user.id);
  } else {
    await removeWatcher(parsed.data.incidentId, user.id);
  }

  revalidatePath("/incidents/[key]", "page");
  return {};
}
