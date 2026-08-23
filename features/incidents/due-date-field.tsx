"use client";

import { useOptimistic, useTransition } from "react";
import { DatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/components/ui/toaster";
import { cn } from "@/lib/cn";
import { setIncidentDueDate } from "./actions";

function formatDisplay(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${iso}T12:00:00Z`));
}

export function DueDateField({
  incidentId,
  incidentKey,
  dueDate,
  resolved,
}: {
  incidentId: string;
  incidentKey: string;
  dueDate: string | null;
  resolved: boolean;
}) {
  const [optimisticDate, setOptimisticDate] = useOptimistic(
    dueDate ? dueDate.slice(0, 10) : "",
  );
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  // Compare calendar dates as strings, not timestamps: a due date of *today*
  // must not flip to overdue mid-morning.
  const now = new Date();
  const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const overdue = optimisticDate !== "" && !resolved && optimisticDate < localToday;

  function change(next: string) {
    if (next === optimisticDate) return;
    const toastId = toast.push("loading", `Updating ${incidentKey}…`);
    startTransition(async () => {
      setOptimisticDate(next);
      const result = await setIncidentDueDate({ id: incidentId, dueDate: next });
      if (result.error) {
        toast.update(toastId, "error", result.error);
      } else {
        toast.update(
          toastId,
          "success",
          next
            ? `${incidentKey} due ${formatDisplay(next)}`
            : `${incidentKey} due date cleared`,
        );
      }
    });
  }

  return (
    <DatePicker
      aria-label="Due date"
      variant="ghost"
      align="end"
      value={optimisticDate}
      disabled={isPending}
      onChange={change}
      placeholder="Set due date"
      triggerClassName={cn(overdue && "font-medium text-red-400 hover:text-red-300")}
    />
  );
}
