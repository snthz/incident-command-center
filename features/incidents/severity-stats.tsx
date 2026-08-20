import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { getSeverityStats } from "./queries";
import { severityValues } from "./schema";

const severityAccents: Record<string, string> = {
  critical: "text-red-300",
  high: "text-orange-300",
  medium: "text-amber-300",
  low: "text-sky-300",
};

export async function SeverityStats() {
  const stats = await getSeverityStats();

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {severityValues.map((severity) => (
        <li key={severity}>
          <Link
            href={`/dashboard?severity=${severity}`}
            className="flex flex-col gap-1 rounded-lg border border-line bg-surface p-4 transition-colors hover:border-neutral-600"
          >
            <span className={`text-xs font-medium uppercase tracking-wide ${severityAccents[severity]}`}>
              {severity}
            </span>
            <span className="text-2xl font-semibold text-foreground">
              {stats[severity] ?? 0}
            </span>
            <span className="text-xs text-muted">active</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function SeverityStatsSkeleton() {
  return (
    <div aria-busy className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {severityValues.map((severity) => (
        <Skeleton key={severity} className="h-[102px]" />
      ))}
    </div>
  );
}
