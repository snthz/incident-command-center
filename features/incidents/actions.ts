"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { moveIncidentSchema } from "./schema";

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
  return {};
}
