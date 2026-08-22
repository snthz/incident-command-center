"use client";

import { useOptimistic, useTransition } from "react";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toaster";
import type { IncidentStatus } from "@/lib/generated/prisma/enums";
import { updateIncidentStatus } from "./actions";
import { statusLabels, statusValues } from "./schema";

export function StatusSelect({
  incidentId,
  incidentKey,
  status,
}: {
  incidentId: string;
  incidentKey: string;
  status: IncidentStatus;
}) {
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(status);
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  function change(next: IncidentStatus) {
    if (next === optimisticStatus) return;
    const toastId = toast.push("loading", `Moving ${incidentKey}…`);
    startTransition(async () => {
      setOptimisticStatus(next);
      const result = await updateIncidentStatus({ id: incidentId, status: next });
      if (result.error) {
        toast.update(toastId, "error", result.error);
      } else {
        toast.update(toastId, "success", `${incidentKey} → ${statusLabels[next]}`);
      }
    });
  }

  return (
    <Select
      aria-label="Incident status"
      value={optimisticStatus}
      disabled={isPending}
      onChange={(value) => change(value as IncidentStatus)}
      options={statusValues.map((item) => ({
        value: item,
        label: statusLabels[item],
      }))}
    />
  );
}
