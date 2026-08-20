import Link from "next/link";

export default function IncidentNotFound() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-surface px-6 py-16 text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">404</p>
      <h1 className="text-lg font-semibold text-foreground">Incident not found</h1>
      <p className="max-w-sm text-sm text-muted">
        This incident does not exist or may have been removed.
      </p>
      <Link
        href="/dashboard"
        className="mt-2 rounded-md bg-brand px-3 py-2 text-sm font-semibold text-brand-contrast hover:bg-brand-hover"
      >
        Back to incidents
      </Link>
    </div>
  );
}
