"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { moveIncidentSchema, postUpdateSchema } from "./schema";

export type MoveIncidentResult = { error?: string };

export async function updateIncidentStatus(input: {
  id: string;
  status: string;
}): Promise<MoveIncidentResult> {
  const user = await getUser();
  if (!user) {
    return { error: "Your session has expired. Sign in again." };
  }

  const parsed = moveIncidentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "That status change is not valid." };
  }

  try {
    await prisma.incident.update({
      where: { id: parsed.data.id },
      data: { status: parsed.data.status },
    });
  } catch {
    return { error: "Could not update the incident. Try again." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/incidents/[key]", "page");
  return {};
}

export async function postIncidentUpdate(input: {
  id: string;
  incidentId: string;
  message: string;
}): Promise<{ error?: string }> {
  const user = await getUser();
  if (!user) {
    return { error: "Your session has expired. Sign in again." };
  }

  const parsed = postUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "The update message is not valid." };
  }

  try {
    await prisma.incidentUpdate.create({
      data: {
        id: parsed.data.id,
        incidentId: parsed.data.incidentId,
        authorId: user.id,
        message: parsed.data.message,
      },
    });
  } catch {
    return { error: "Could not post the update. Try again." };
  }

  revalidatePath("/incidents/[key]", "page");
  revalidatePath("/dashboard");
  return {};
}
