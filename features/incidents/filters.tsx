"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select";
import { severityValues, statusValues, type IncidentFilters } from "./schema";

function capitalize(value: string) {
  return value[0].toUpperCase() + value.slice(1);
}

export function IncidentFiltersBar({ filters }: { filters: IncidentFilters }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function apply(key: "status" | "severity", value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    startTransition(() => {
      router.replace(params.size ? `${pathname}?${params}` : pathname, {
        scroll: false,
      });
    });
  }

  const hasFilters = Boolean(filters.status || filters.severity);

  return (
    <div
      data-pending={isPending ? "" : undefined}
      className="flex flex-wrap items-center gap-4"
    >
      <SelectField
        label="Status"
        value={filters.status ?? ""}
        onChange={(event) => apply("status", event.target.value)}
      >
        <option value="">All</option>
        {statusValues.map((status) => (
          <option key={status} value={status}>
            {capitalize(status)}
          </option>
        ))}
      </SelectField>

      <SelectField
        label="Severity"
        value={filters.severity ?? ""}
        onChange={(event) => apply("severity", event.target.value)}
      >
        <option value="">All</option>
        {severityValues.map((severity) => (
          <option key={severity} value={severity}>
            {capitalize(severity)}
          </option>
        ))}
      </SelectField>

      {hasFilters ? (
        <Button
          variant="ghost"
          className="px-2 py-1 text-sm font-normal"
          onClick={() => {
            startTransition(() => {
              router.replace(pathname, { scroll: false });
            });
          }}
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
