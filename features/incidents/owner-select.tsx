"use client";

import { useOptimistic, useTransition } from "react";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toaster";
import { assignIncident } from "./actions";
import { assigneeOptions } from "./assignee-options";
import type { ProfileOption } from "./queries";

export function OwnerSelect({
  incidentId,
  incidentKey,
  ownerId,
  profiles,
}: {
  incidentId: string;
  incidentKey: string;
  ownerId: string | null;
  profiles: ProfileOption[];
}) {
  const [optimisticOwner, setOptimisticOwner] = useOptimistic(ownerId ?? "");
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  const nameOf = (id: string) =>
    profiles.find((profile) => profile.id === id)?.name ?? "Unassigned";

  function change(next: string) {
    if (next === optimisticOwner) return;
    const label = next ? nameOf(next) : "Unassigned";
    const toastId = toast.push("loading", `Assigning ${incidentKey} to ${label}…`);
    startTransition(async () => {
      setOptimisticOwner(next);
      const result = await assignIncident({ id: incidentId, ownerId: next });
      if (result.error) {
        toast.update(toastId, "error", result.error);
      } else {
        toast.update(
          toastId,
          "success",
          next ? `${incidentKey} assigned to ${label}` : `${incidentKey} unassigned`,
        );
      }
    });
  }

  return (
    <Select
      aria-label="Assignee"
      variant="ghost"
      value={optimisticOwner}
      disabled={isPending}
      onChange={change}
      options={assigneeOptions(profiles)}
    />
  );
}
