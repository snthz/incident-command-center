import Link from "next/link";
import { cn } from "@/lib/cn";
import type { DashboardView, IncidentFilters } from "../schema";

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
  { value: "list", label: "Table", icon: listIcon },
];

export function ViewToggle({
  view,
  filters,
  basePath,
}: {
  view: DashboardView;
  filters: IncidentFilters;
  basePath: string;
}) {
  function hrefFor(target: DashboardView) {
    const params = new URLSearchParams();
    if (filters.severity) params.set("severity", filters.severity);
    if (filters.q) params.set("q", filters.q);
    if (target === "list") {
      if (filters.status) params.set("status", filters.status);
      params.set("view", "list");
    }
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  }

  return (
    <div role="group" aria-label="View mode" className="flex items-center gap-5">
      {options.map((option) => (
        <Link
          key={option.value}
          href={hrefFor(option.value)}
          aria-current={view === option.value ? "page" : undefined}
          className={cn(
            "-mb-px flex items-center gap-1.5 border-b-2 pb-2.5 pt-1 text-sm transition-colors",
            view === option.value
              ? "border-foreground font-medium text-foreground"
              : "border-transparent text-muted hover:text-neutral-200",
          )}
        >
          {option.icon}
          {option.label}
        </Link>
      ))}
    </div>
  );
}
