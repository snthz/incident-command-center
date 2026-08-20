"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select";
import {
  severityLabels,
  severityValues,
  statusLabels,
  statusValues,
  type IncidentFilters,
} from "./schema";

const SEARCH_DEBOUNCE_MS = 300;

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
  const [query, setQuery] = useState(filters.q ?? "");
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (document.activeElement !== searchRef.current) {
      setQuery(filters.q ?? "");
    }
  }, [filters.q]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function replaceParams(params: URLSearchParams) {
    startTransition(() => {
      router.replace(params.size ? `${pathname}?${params}` : pathname, {
        scroll: false,
      });
    });
  }

  function apply(key: "status" | "severity" | "q", value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    replaceParams(params);
  }

  function onSearchChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      apply("q", value.trim());
    }, SEARCH_DEBOUNCE_MS);
  }

  function clear() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQuery("");
    const params = new URLSearchParams(searchParams);
    params.delete("status");
    params.delete("severity");
    params.delete("q");
    replaceParams(params);
  }

  const hasFilters = Boolean(
    (showStatus && filters.status) || filters.severity || filters.q,
  );

  return (
    <div
      data-pending={isPending ? "" : undefined}
      className="flex flex-wrap items-center gap-4"
    >
      <div className="relative">
        <svg
          aria-hidden
          viewBox="0 0 14 14"
          className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          <circle cx="6" cy="6" r="4.2" />
          <path d="m9.2 9.2 3 3" />
        </svg>
        <Input
          ref={searchRef}
          type="search"
          aria-label="Search incidents"
          placeholder="Search incidents…"
          value={query}
          onChange={(event) => onSearchChange(event.target.value)}
          className="w-56 py-1.5 pl-8 text-sm"
        />
      </div>

      {showStatus ? (
        <SelectField
          label="Status"
          value={filters.status ?? ""}
          onChange={(value) => apply("status", value)}
          options={[
            { value: "", label: "All" },
            ...statusValues.map((status) => ({
              value: status,
              label: statusLabels[status],
            })),
          ]}
        />
      ) : null}

      <SelectField
        label="Severity"
        value={filters.severity ?? ""}
        onChange={(value) => apply("severity", value)}
        options={[
          { value: "", label: "All" },
          ...severityValues.map((severity) => ({
            value: severity,
            label: severityLabels[severity],
          })),
        ]}
      />

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
