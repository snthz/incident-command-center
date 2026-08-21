import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/features/branding/logo";
import { SeverityBadge, StatusBadge } from "@/features/incidents/badges";
import type {
  IncidentSeverity,
  IncidentStatus,
} from "@/lib/generated/prisma/enums";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Severity guide — Incident Command Center",
  description:
    "How we classify incident severity and what each status means in the incident lifecycle.",
};

const severities: {
  value: IncidentSeverity;
  meaning: string;
  response: string;
  examples: string;
}[] = [
  {
    value: "critical",
    meaning:
      "Full outage, data loss, or a security breach. Most users cannot use the product.",
    response:
      "All hands. Page the on-call immediately, open a war room, post updates at least every 30 minutes.",
    examples: "API down, checkout broken, database unreachable.",
  },
  {
    value: "high",
    meaning:
      "A core feature is broken or severely degraded for a large share of users. No reasonable workaround.",
    response:
      "On-call responds within 30 minutes during business hours and works it as the top priority.",
    examples: "Login failing for a region, uploads erroring, payment retries spiking.",
  },
  {
    value: "medium",
    meaning:
      "Partial degradation with a known workaround, or an issue limited to a small group of users.",
    response:
      "Assign an owner the same business day. Fix lands within normal sprint work.",
    examples: "Slow dashboard queries, a broken export format, elevated error rate on one endpoint.",
  },
  {
    value: "low",
    meaning:
      "Cosmetic or minor issue with no meaningful user impact.",
    response:
      "Track it and schedule it. No interruption to planned work.",
    examples: "Misaligned UI, stale copy, noisy but harmless log warnings.",
  },
];

const statuses: {
  value: IncidentStatus;
  description: string;
}[] = [
  {
    value: "investigating",
    description:
      "We know something is wrong and are confirming the impact and looking for the cause. Expect frequent updates.",
  },
  {
    value: "identified",
    description:
      "Root cause found. A fix or mitigation is being worked on and we can usually estimate recovery.",
  },
  {
    value: "monitoring",
    description:
      "A fix has been deployed. We are watching metrics to confirm the incident does not recur before closing it.",
  },
  {
    value: "resolved",
    description:
      "Service is stable and the incident is closed. The resolution time is recorded for the postmortem.",
  },
];

export default function AboutSeveritiesPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="border-b border-line bg-surface">
        <nav
          aria-label="Main"
          className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-4 px-4"
        >
          <Link href="/dashboard" aria-label="Incident Command Center">
            <Logo size={28} />
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-muted hover:text-neutral-200"
          >
            Go to dashboard
          </Link>
        </nav>
      </header>

      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <article className="flex flex-col gap-10">
          <header className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold text-foreground">
              Severity guide
            </h1>
            <p className="text-sm leading-relaxed text-muted">
              A shared vocabulary for triage. Severity describes how bad the
              impact is; status describes where we are in the response. Pick the
              severity from user impact alone — never from how hard the fix
              looks.
            </p>
          </header>

          <section aria-labelledby="severity-levels" className="flex flex-col gap-4">
            <h2 id="severity-levels" className="text-lg font-semibold text-foreground">
              Severity levels
            </h2>
            <ul className="flex flex-col gap-4">
              {severities.map((severity) => (
                <li
                  key={severity.value}
                  className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-5"
                >
                  <SeverityBadge severity={severity.value} className="self-start" />
                  <p className="text-sm leading-relaxed text-foreground">
                    {severity.meaning}
                  </p>
                  <dl className="flex flex-col gap-2 text-sm">
                    <div className="flex flex-col gap-0.5">
                      <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                        Expected response
                      </dt>
                      <dd className="leading-relaxed text-neutral-300">
                        {severity.response}
                      </dd>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                        Typical examples
                      </dt>
                      <dd className="leading-relaxed text-neutral-300">
                        {severity.examples}
                      </dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="status-lifecycle" className="flex flex-col gap-4">
            <h2 id="status-lifecycle" className="text-lg font-semibold text-foreground">
              Status lifecycle
            </h2>
            <p className="text-sm leading-relaxed text-muted">
              Every incident moves through these states in order. It can step
              back — a fix that does not hold goes from Monitoring to
              Investigating — but it never skips Resolved.
            </p>
            <ol className="flex flex-col gap-3">
              {statuses.map((status, index) => (
                <li
                  key={status.value}
                  className="flex items-start gap-4 rounded-lg border border-line bg-surface p-5"
                >
                  <span
                    aria-hidden
                    className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-line bg-surface-2 font-mono text-xs text-muted"
                  >
                    {index + 1}
                  </span>
                  <div className="flex flex-col gap-1.5">
                    <StatusBadge status={status.value} className="self-start" />
                    <p className="text-sm leading-relaxed text-neutral-300">
                      {status.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </article>
      </main>
    </div>
  );
}
