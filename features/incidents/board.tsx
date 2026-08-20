"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { Select } from "@/components/ui/select";
import { TimeAgo } from "@/components/ui/time-ago";
import { useToast } from "@/components/ui/toaster";
import { cn } from "@/lib/cn";
import type { IncidentStatus } from "@/lib/generated/prisma/enums";
import { updateIncidentStatus } from "./actions";
import { SeverityBadge, StatusIcon } from "./badges";
import type { IncidentListItem } from "./queries";
import { statusLabels, statusValues } from "./schema";

type Move = { id: string; status: IncidentStatus };

export function IncidentBoard({ incidents }: { incidents: IncidentListItem[] }) {
  const [optimisticIncidents, applyMove] = useOptimistic(
    incidents,
    (current, move: Move) =>
      current.map((incident) =>
        incident.id === move.id ? { ...incident, status: move.status } : incident,
      ),
  );
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<IncidentStatus | null>(null);
  const [, startTransition] = useTransition();
  const toast = useToast();

  const pendingIds = new Set(
    optimisticIncidents
      .filter(
        (incident) =>
          incidents.find((base) => base.id === incident.id)?.status !==
          incident.status,
      )
      .map((incident) => incident.id),
  );

  function moveIncident(id: string, status: IncidentStatus) {
    const incident = optimisticIncidents.find((item) => item.id === id);
    if (!incident || incident.status === status) return;
    const toastId = toast.push(
      "loading",
      `Moving "${incident.title}" to ${statusLabels[status]}…`,
    );
    startTransition(async () => {
      applyMove({ id, status });
      const result = await updateIncidentStatus({ id, status });
      if (result.error) {
        toast.update(toastId, "error", result.error);
      } else {
        toast.update(
          toastId,
          "success",
          `"${incident.title}" moved to ${statusLabels[status]}`,
        );
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative snap-x snap-mandatory overflow-x-auto pb-2 xl:overflow-visible xl:pb-0">
        <div className="flex gap-3 xl:grid xl:grid-cols-4">
        {statusValues.map((status) => {
          const items = optimisticIncidents.filter(
            (incident) => incident.status === status,
          );
          return (
            <section
              key={status}
              aria-label={`${statusLabels[status]} (${items.length})`}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDropTarget(status);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                  setDropTarget(null);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                const id = event.dataTransfer.getData("text/plain");
                setDropTarget(null);
                setDragId(null);
                if (id) moveIncident(id, status);
              }}
              className={cn(
                "flex min-h-56 w-72 shrink-0 snap-start flex-col gap-2 rounded-lg border bg-surface/50 p-2 transition-colors xl:w-auto",
                dropTarget === status && dragId
                  ? "border-brand/60 bg-surface-2"
                  : "border-line",
              )}
            >
              <header className="flex items-center gap-2 px-1.5 py-1.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                  {statusLabels[status]}
                </h3>
                <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-muted">
                  {items.length}
                </span>
                {status === "resolved" ? <StatusIcon status={status} /> : null}
              </header>
              {items.length === 0 ? (
                <p className="flex flex-1 items-center justify-center rounded-md border border-dashed border-line px-3 py-6 text-center text-xs text-muted">
                  No incidents
                </p>
              ) : (
                <ul className="flex flex-1 flex-col gap-2">
                  {items.map((incident) => (
                    <BoardCard
                      key={incident.id}
                      incident={incident}
                      pending={pendingIds.has(incident.id)}
                      dragging={dragId === incident.id}
                      onDragStart={() => setDragId(incident.id)}
                      onDragEnd={() => {
                        setDragId(null);
                        setDropTarget(null);
                      }}
                      onMove={moveIncident}
                    />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
        </div>
      </div>
    </div>
  );
}

function BoardCard({
  incident,
  pending,
  dragging,
  onDragStart,
  onDragEnd,
  onMove,
}: {
  incident: IncidentListItem;
  pending: boolean;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onMove: (id: string, status: IncidentStatus) => void;
}) {
  return (
    <li
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", incident.id);
        event.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "flex cursor-grab flex-col gap-2 rounded-md border border-line bg-surface p-3 active:cursor-grabbing",
        dragging && "opacity-40",
      )}
    >
      <Link
        draggable={false}
        href={`/incidents/${incident.key}`}
        className="text-sm text-foreground hover:underline"
      >
        {incident.title}
      </Link>
      <div className="flex items-center justify-between gap-2">
        <SeverityBadge severity={incident.severity} />
        <Select
          size="sm"
          variant="ghost"
          align="end"
          aria-label={`Change status of ${incident.title}`}
          value={incident.status}
          disabled={pending}
          onChange={(value) => onMove(incident.id, value as IncidentStatus)}
          options={statusValues.map((status) => ({
            value: status,
            label: statusLabels[status],
          }))}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2">
        <span className="font-mono text-[11px] text-muted">{incident.key}</span>
        <span className="flex items-center gap-2">
          <TimeAgo date={incident.updatedAt} className="text-xs text-muted" />
          {incident.owner ? (
            <span
              title={incident.owner.name}
              className="flex size-5 items-center justify-center rounded-full bg-surface-2 text-[9px] font-semibold text-neutral-300"
            >
              {incident.owner.name
                .split(" ")
                .map((part) => part[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
              <span className="sr-only">{incident.owner.name}</span>
            </span>
          ) : null}
        </span>
      </div>
    </li>
  );
}
