"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import {
  severityLabels,
  severityValues,
  statusLabels,
  statusValues,
  type IncidentFilters,
} from "../schema";

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
  const [searchOpen, setSearchOpen] = useState(Boolean(filters.q));
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Render-phase state adjustment (not an effect): reopen the search as soon
  // as a ?q= arrives in the URL, e.g. via back/forward or a shared link.
  const [lastAppliedQuery, setLastAppliedQuery] = useState(filters.q);
  if (filters.q !== lastAppliedQuery) {
    setLastAppliedQuery(filters.q);
    if (filters.q) setSearchOpen(true);
  }

  useEffect(() => {
    if (document.activeElement !== searchRef.current) {
      setQuery(filters.q ?? "");
    }
  }, [filters.q]);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

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
      className="flex flex-wrap items-center gap-1.5"
    >
      {searchOpen ? (
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
            placeholder="Search…"
            value={query}
            onChange={(event) => onSearchChange(event.target.value)}
            onBlur={() => {
              if (!query.trim()) setSearchOpen(false);
            }}
            className="w-44 py-1.5 pl-8 pr-8 text-sm lg:w-56"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              // preventDefault so the input's blur-collapse doesn't eat the click
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onSearchChange("");
                searchRef.current?.focus();
              }}
              className="absolute right-1.5 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded text-muted transition-colors hover:bg-white/5 hover:text-neutral-200"
            >
              <svg aria-hidden viewBox="0 0 12 12" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="m2.5 2.5 7 7m0-7-7 7" />
              </svg>
            </button>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          aria-label="Search incidents"
          aria-expanded={searchOpen}
          onClick={() => setSearchOpen(true)}
          className="flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-white/5 hover:text-foreground"
        >
          <svg
            aria-hidden
            viewBox="0 0 14 14"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <circle cx="6" cy="6" r="4.2" />
            <path d="m9.2 9.2 3 3" />
          </svg>
        </button>
      )}

      {showStatus ? (
        <Select
          aria-label="Filter by status"
          variant="ghost"
          value={filters.status ?? ""}
          onChange={(value) => apply("status", value)}
          options={[
            { value: "", label: "Status" },
            ...statusValues.map((status) => ({
              value: status,
              label: statusLabels[status],
            })),
          ]}
        />
      ) : null}

      <Select
        aria-label="Filter by severity"
        variant="ghost"
        align="end"
        value={filters.severity ?? ""}
        onChange={(value) => apply("severity", value)}
        iconOnly={
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            className={cn("size-4", filters.severity && "text-brand")}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2.5 3.5h11l-4.2 5v3.6l-2.6 1.4V8.5l-4.2-5Z" />
          </svg>
        }
        options={[
          { value: "", label: "All severities" },
          ...severityValues.map((severity) => ({
            value: severity,
            label: severityLabels[severity],
          })),
        ]}
      />

      {hasFilters ? (
        <button
          type="button"
          aria-label="Clear filters"
          onClick={clear}
          className="flex size-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-white/5 hover:text-neutral-200"
        >
          <svg aria-hidden viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="m2.5 2.5 7 7m0-7-7 7" />
          </svg>
        </button>
      ) : null}

      <span role="status" className="sr-only">
        {isPending ? "Updating incident list" : ""}
      </span>
    </div>
  );
}
