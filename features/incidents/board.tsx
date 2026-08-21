"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { Select } from "@/components/ui/select";
import { TimeAgo } from "@/components/ui/time-ago";
import { useToast } from "@/components/ui/toaster";
import { cn } from "@/lib/cn";
import type { IncidentStatus } from "@/lib/generated/prisma/enums";
import { reorderIncident, updateIncidentStatus } from "./actions";
import { SeverityBadge, StatusIcon } from "./badges";
import type { IncidentListItem } from "./queries";
import { statusLabels, statusValues } from "./schema";

type DropSlot = {
  status: IncidentStatus;
  beforeId: string | null;
  afterId: string | null;
};

type Move = DropSlot & { id: string };

/**
 * Mirrors the insertion rule the server applies, so the optimistic list and the
 * revalidated one agree. Used both for the drag preview and the optimistic move.
 */
function reorder(list: IncidentListItem[], move: Move) {
  const moving = list.find((item) => item.id === move.id);
  if (!moving) return list;

  const rest = list.filter((item) => item.id !== move.id);
  let index = -1;

  if (move.beforeId) {
    const found = rest.findIndex((item) => item.id === move.beforeId);
    if (found >= 0) index = found + 1;
  }
  if (index < 0 && move.afterId) {
    const found = rest.findIndex((item) => item.id === move.afterId);
    if (found >= 0) index = found;
  }
  if (index < 0) {
    // No usable anchor: land at the bottom of the target column.
    index = rest.reduce(
      (last, item, at) => (item.status === move.status ? at + 1 : last),
      0,
    );
  }

  rest.splice(index, 0, { ...moving, status: move.status });
  return rest;
}

function isNoop(before: IncidentListItem[], after: IncidentListItem[]) {
  return after.every(
    (item, at) =>
      before[at]?.id === item.id && before[at]?.status === item.status,
  );
}

/**
 * Reads the drop slot off the rendered column: the first card whose midpoint
 * sits below the pointer becomes `afterId`, the previous one `beforeId`.
 * Measuring the DOM rather than indices keeps the gaps between cards, the
 * header and the empty space below the list all pointing at a sane slot.
 */
function slotAt(section: HTMLElement, clientY: number, draggingId: string) {
  let beforeId: string | null = null;

  for (const card of Array.from(
    section.querySelectorAll<HTMLElement>("[data-incident-id]"),
  )) {
    const id = card.dataset.incidentId;
    if (!id || id === draggingId) continue;

    const rect = card.getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) return { beforeId, afterId: id };
    beforeId = id;
  }

  return { beforeId, afterId: null };
}

export function IncidentBoard({ incidents }: { incidents: IncidentListItem[] }) {
  const [optimisticIncidents, applyMove] = useOptimistic(incidents, reorder);
  const [dragId, setDragId] = useState<string | null>(null);
  const [slot, setSlot] = useState<DropSlot | null>(null);
  const [, startTransition] = useTransition();
  const toast = useToast();

  // While dragging, the card is rendered in the slot it would land in, so the
  // board itself is the drop indicator.
  const preview =
    dragId && slot
      ? reorder(optimisticIncidents, { id: dragId, ...slot })
      : optimisticIncidents;

  const pendingIds = new Set(
    optimisticIncidents
      .filter(
        (incident) =>
          incidents.find((base) => base.id === incident.id)?.status !==
          incident.status,
      )
      .map((incident) => incident.id),
  );

  function endDrag() {
    setDragId(null);
    setSlot(null);
  }

  function commitMove(id: string, target: DropSlot) {
    const incident = optimisticIncidents.find((item) => item.id === id);
    if (!incident) return;

    const move: Move = { id, ...target };
    if (isNoop(optimisticIncidents, reorder(optimisticIncidents, move))) return;

    const changesColumn = incident.status !== target.status;
    const toastId = toast.push(
      "loading",
      changesColumn
        ? `Moving "${incident.title}" to ${statusLabels[target.status]}…`
        : `Reordering "${incident.title}"…`,
    );

    startTransition(async () => {
      applyMove(move);
      const result = await reorderIncident({
        id,
        status: target.status,
        beforeId: target.beforeId,
        afterId: target.afterId,
      });
      if (result.error) {
        toast.update(toastId, "error", result.error);
      } else {
        toast.update(
          toastId,
          "success",
          changesColumn
            ? `"${incident.title}" moved to ${statusLabels[target.status]}`
            : `"${incident.title}" reordered`,
        );
      }
    });
  }

  function changeStatus(id: string, status: IncidentStatus) {
    const incident = optimisticIncidents.find((item) => item.id === id);
    if (!incident || incident.status === status) return;

    // The select has no drop point, so mirror the server: bottom of the column.
    const lastInColumn = optimisticIncidents.reduce<string | null>(
      (last, item) =>
        item.status === status && item.id !== id ? item.id : last,
      null,
    );
    const toastId = toast.push(
      "loading",
      `Moving "${incident.title}" to ${statusLabels[status]}…`,
    );

    startTransition(async () => {
      applyMove({ id, status, beforeId: lastInColumn, afterId: null });
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
          const items = preview.filter((incident) => incident.status === status);
          return (
            <section
              key={status}
              aria-label={`${statusLabels[status]} (${items.length})`}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                if (!dragId) return;
                const next = slotAt(event.currentTarget, event.clientY, dragId);
                setSlot((current) =>
                  current &&
                  current.status === status &&
                  current.beforeId === next.beforeId &&
                  current.afterId === next.afterId
                    ? current
                    : { status, ...next },
                );
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                  setSlot(null);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                const id = event.dataTransfer.getData("text/plain") || dragId;
                const target = slot;
                endDrag();
                if (id && target) commitMove(id, target);
              }}
              className={cn(
                "flex min-h-56 w-72 shrink-0 snap-start flex-col gap-2 rounded-lg border bg-background/40 p-2 transition-colors xl:w-auto",
                slot?.status === status && dragId
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
                      onDragEnd={endDrag}
                      onStatusChange={changeStatus}
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
  onStatusChange,
}: {
  incident: IncidentListItem;
  pending: boolean;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onStatusChange: (id: string, status: IncidentStatus) => void;
}) {
  return (
    <li
      draggable
      data-incident-id={incident.id}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", incident.id);
        event.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "flex cursor-grab flex-col gap-2 rounded-md border bg-surface-2 p-3 active:cursor-grabbing",
        dragging
          ? "border-dashed border-brand/60 opacity-50"
          : "border-line",
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
          onChange={(value) => onStatusChange(incident.id, value as IncidentStatus)}
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
