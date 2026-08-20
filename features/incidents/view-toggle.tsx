import Link from "next/link";
import { cn } from "@/lib/cn";
import type { DashboardView, IncidentFilters } from "./schema";

const boardIcon = (
  <svg aria-hidden viewBox="0 0 14 14" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
    <rect x="1.5" y="2" width="4.4" height="10" rx="1" />
    <rect x="8.1" y="2" width="4.4" height="6.5" rx="1" />
  </svg>
);

const listIcon = (
  <svg aria-hidden viewBox="0 0 14 14" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
    <path d="M2 3.5h10M2 7h10M2 10.5h10" />
  </svg>
);

const options: Array<{ value: DashboardView; label: string; icon: React.ReactNode }> = [
  { value: "board", label: "Board", icon: boardIcon },
  { value: "list", label: "List", icon: listIcon },
];

export function ViewToggle({
  view,
  filters,
}: {
  view: DashboardView;
  filters: IncidentFilters;
}) {
  function hrefFor(target: DashboardView) {
    const params = new URLSearchParams();
    if (filters.severity) params.set("severity", filters.severity);
    if (target === "list") {
      if (filters.status) params.set("status", filters.status);
      params.set("view", "list");
    }
    const query = params.toString();
    return query ? `/dashboard?${query}` : "/dashboard";
  }

  return (
    <div role="group" aria-label="View mode" className="inline-flex rounded-md border border-line p-0.5">
      {options.map((option) => (
        <Link
          key={option.value}
          href={hrefFor(option.value)}
          aria-current={view === option.value ? "page" : undefined}
          className={cn(
            "flex items-center gap-1.5 rounded px-2.5 py-1 text-sm transition-colors",
            view === option.value
              ? "bg-surface-2 text-foreground"
              : "text-muted hover:text-foreground",
          )}
        >
          {option.icon}
          {option.label}
        </Link>
      ))}
    </div>
  );
}
