"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useEffect, useId, useState } from "react";
import { TimeAgo } from "@/components/ui/time-ago";
import { cn } from "@/lib/cn";
import { createRealtimeClient } from "@/lib/supabase/client";
import { LiveFeed, type FeedUpdate } from "./live-feed";
import { statusLabels } from "./schema";
import type { IncidentStatus } from "@/lib/generated/prisma/enums";

export type ActivityEvent = {
  id: string;
  type: string;
  fromValue: string | null;
  toValue: string | null;
  actorName: string | null;
  createdAt: string;
};

const profileNames = new Map<string, string>();

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function statusLabel(value: string | null) {
  if (!value) return "?";
  return statusLabels[value as IncidentStatus] ?? value;
}

function formatDate(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

function Strong({ children }: { children: React.ReactNode }) {
  return <span className="font-medium text-neutral-200">{children}</span>;
}

function eventSentence(event: ActivityEvent) {
  switch (event.type) {
    case "created":
      return <>created the incident</>;
    case "status_changed":
      return (
        <>
          changed status from <Strong>{statusLabel(event.fromValue)}</Strong> to{" "}
          <Strong>{statusLabel(event.toValue)}</Strong>
        </>
      );
    case "assignee_changed":
      if (!event.toValue) return <>unassigned the incident</>;
      if (!event.fromValue)
        return (
          <>
            assigned the incident to <Strong>{event.toValue}</Strong>
          </>
        );
      return (
        <>
          reassigned from <Strong>{event.fromValue}</Strong> to{" "}
          <Strong>{event.toValue}</Strong>
        </>
      );
    case "due_date_changed":
      if (!event.toValue) return <>removed the due date</>;
      return (
        <>
          set the due date to <Strong>{formatDate(event.toValue)}</Strong>
        </>
      );
    case "title_edited":
      return (
        <>
          renamed the incident to{" "}
          <Strong>&ldquo;{event.toValue}&rdquo;</Strong>
        </>
      );
    case "description_edited":
      return <>updated the description</>;
    case "attachment_added":
      return (
        <>
          attached <Strong>{event.toValue}</Strong>
        </>
      );
    case "attachment_removed":
      return (
        <>
          removed attachment <Strong>{event.fromValue}</Strong>
        </>
      );
    default:
      return <>updated the incident</>;
  }
}

function EventHistory({
  incidentId,
  initialEvents,
}: {
  incidentId: string;
  initialEvents: ActivityEvent[];
}) {
  const [liveEvents, setLiveEvents] = useState<ActivityEvent[]>([]);

  useEffect(() => {
    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    let client: Awaited<ReturnType<typeof createRealtimeClient>> | null = null;

    (async () => {
      const supabase = await createRealtimeClient();
      if (cancelled) return;
      client = supabase;
      channel = supabase
        .channel(`incident-events-${incidentId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "incident_events",
            filter: `incident_id=eq.${incidentId}`,
          },
          async (payload) => {
            const row = payload.new as {
              id: string;
              actor_id: string | null;
              type: string;
              from_value: string | null;
              to_value: string | null;
              created_at: string;
            };
            let actorName = row.actor_id
              ? profileNames.get(row.actor_id)
              : undefined;
            if (row.actor_id && actorName === undefined) {
              const { data } = await supabase
                .from("profiles")
                .select("name")
                .eq("id", row.actor_id)
                .single();
              if (data?.name) {
                actorName = data.name;
                profileNames.set(row.actor_id, data.name);
              }
            }
            const event: ActivityEvent = {
              id: row.id,
              type: row.type,
              fromValue: row.from_value,
              toValue: row.to_value,
              actorName: actorName ?? null,
              createdAt: row.created_at,
            };
            setLiveEvents((current) =>
              current.some((existing) => existing.id === event.id)
                ? current
                : [event, ...current],
            );
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (client && channel) client.removeChannel(channel);
    };
  }, [incidentId]);

  const events = [
    ...liveEvents.filter(
      (event) => !initialEvents.some((existing) => existing.id === event.id),
    ),
    ...initialEvents,
  ];

  if (events.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
        No history yet.
      </p>
    );
  }

  return (
    <ol aria-label="Incident history" className="flex flex-col">
      {events.map((event) => (
        <li key={event.id} className="relative flex gap-3 pb-5 last:pb-0">
          <span
            aria-hidden
            className="absolute left-3.5 top-8 h-[calc(100%-2rem)] w-px bg-line"
          />
          <span
            aria-hidden
            className="z-10 flex size-7 shrink-0 items-center justify-center rounded-full border border-line bg-surface-2 text-[10px] font-semibold text-neutral-300"
          >
            {event.actorName ? initialsOf(event.actorName) : "?"}
          </span>
          <div className="flex min-w-0 flex-col gap-0.5 pt-1">
            <p className="text-sm leading-snug text-muted">
              <Strong>{event.actorName ?? "Someone"}</Strong>{" "}
              {eventSentence(event)}
            </p>
            <TimeAgo
              date={new Date(event.createdAt)}
              className="text-xs text-muted"
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

export function ActivityTabs({
  incidentId,
  currentUser,
  initialUpdates,
  initialEvents,
}: {
  incidentId: string;
  currentUser: { id: string; name: string };
  initialUpdates: FeedUpdate[];
  initialEvents: ActivityEvent[];
}) {
  const [tab, setTab] = useState<"comments" | "history">("comments");
  const baseId = useId();

  const tabs = [
    { key: "comments" as const, label: "Comments" },
    { key: "history" as const, label: "History" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div
        role="tablist"
        aria-label="Activity"
        className="flex items-center gap-1 rounded-lg border border-line p-1 self-start"
      >
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            id={`${baseId}-tab-${item.key}`}
            aria-selected={tab === item.key}
            aria-controls={`${baseId}-panel-${item.key}`}
            onClick={() => setTab(item.key)}
            className={cn(
              "rounded-md px-3 py-1 text-sm transition-colors",
              tab === item.key
                ? "bg-surface-2 text-foreground"
                : "text-muted hover:text-neutral-200",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Both panels stay mounted (hidden via CSS) so the composer draft and
          the realtime subscriptions survive switching tabs. */}
      <div
        role="tabpanel"
        id={`${baseId}-panel-comments`}
        aria-labelledby={`${baseId}-tab-comments`}
        className={cn(tab !== "comments" && "hidden")}
      >
        <LiveFeed
          incidentId={incidentId}
          currentUser={currentUser}
          initialUpdates={initialUpdates}
        />
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel-history`}
        aria-labelledby={`${baseId}-tab-history`}
        className={cn(tab !== "history" && "hidden")}
      >
        <EventHistory incidentId={incidentId} initialEvents={initialEvents} />
      </div>
    </div>
  );
}
