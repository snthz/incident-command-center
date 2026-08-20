"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select";
import {
  severityLabels,
  severityValues,
  statusLabels,
  statusValues,
  type IncidentFilters,
} from "./schema";

export function IncidentFiltersBar({
  filters,
  showStatus = true,
}: {
  filters: IncidentFilters;
  showStatus?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function replaceParams(params: URLSearchParams) {
    startTransition(() => {
      router.replace(params.size ? `${pathname}?${params}` : pathname, {
        scroll: false,
      });
    });
  }

  function apply(key: "status" | "severity", value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    replaceParams(params);
  }

  function clear() {
    const params = new URLSearchParams(searchParams);
    params.delete("status");
    params.delete("severity");
    replaceParams(params);
  }

  const hasFilters = Boolean((showStatus && filters.status) || filters.severity);

  return (
    <div
      data-pending={isPending ? "" : undefined}
      className="flex flex-wrap items-center gap-4"
    >
      {showStatus ? (
        <SelectField
          label="Status"
          value={filters.status ?? ""}
          onChange={(event) => apply("status", event.target.value)}
        >
          <option value="">All</option>
          {statusValues.map((status) => (
            <option key={status} value={status}>
              {statusLabels[status]}
            </option>
          ))}
        </SelectField>
      ) : null}

      <SelectField
        label="Severity"
        value={filters.severity ?? ""}
        onChange={(event) => apply("severity", event.target.value)}
      >
        <option value="">All</option>
        {severityValues.map((severity) => (
          <option key={severity} value={severity}>
            {severityLabels[severity]}
          </option>
        ))}
      </SelectField>

      {hasFilters ? (
        <Button
          variant="ghost"
          className="px-2 py-1 text-sm font-normal"
          onClick={clear}
        >
          Clear filters
        </Button>
      ) : null}

      <span role="status" className="sr-only">
        {isPending ? "Updating incident list" : ""}
      </span>
    </div>
  );
}
