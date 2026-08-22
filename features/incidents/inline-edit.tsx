"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toaster";
import { cn } from "@/lib/cn";
import { editIncidentText } from "./actions";
import { editIncidentSchema } from "./schema";

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="flex size-7 items-center justify-center rounded-md border border-line bg-surface-2 text-muted shadow-sm transition-colors hover:text-foreground"
    >
      {children}
    </button>
  );
}

const checkIcon = (
  <svg aria-hidden viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="m2.5 6.5 2.5 2.5 4.5-5.5" />
  </svg>
);

const crossIcon = (
  <svg aria-hidden viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <path d="m2.5 2.5 7 7m0-7-7 7" />
  </svg>
);

export function InlineEditable({
  incidentId,
  incidentKey,
  field,
  value,
  multiline = false,
  displayClassName,
  editClassName,
}: {
  incidentId: string;
  incidentKey: string;
  field: "title" | "description";
  value: string;
  multiline?: boolean;
  displayClassName?: string;
  editClassName?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [optimisticValue, setOptimisticValue] = useOptimistic(value);
  const [, startTransition] = useTransition();
  const controlRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const toast = useToast();

  function open() {
    setDraft(optimisticValue);
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setError(null);
  }

  function save() {
    const next = draft.trim();
    if (next === optimisticValue) {
      cancel();
      return;
    }
    const parsed = editIncidentSchema.safeParse({
      id: incidentId,
      [field]: next,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "That change is not valid.");
      controlRef.current?.focus();
      return;
    }
    setEditing(false);
    setError(null);
    startTransition(async () => {
      setOptimisticValue(next);
      const result = await editIncidentText({ id: incidentId, [field]: next });
      if (result.error) {
        toast.push("error", result.error);
      } else {
        toast.push("success", `${incidentKey} updated`);
      }
    });
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    } else if (
      event.key === "Enter" &&
      (!multiline || event.metaKey || event.ctrlKey)
    ) {
      event.preventDefault();
      save();
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        aria-label={`Edit ${field}`}
        onClick={open}
        className={cn(
          "-mx-2 block w-full rounded-md px-2 py-1 text-left transition-colors hover:bg-white/5",
          displayClassName,
        )}
      >
        {optimisticValue}
      </button>
    );
  }

  return (
    <div className="-mx-2 flex flex-col gap-1.5">
      {multiline ? (
        <Textarea
          ref={controlRef}
          autoFocus
          rows={Math.min(10, Math.max(3, draft.split("\n").length + 1))}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          aria-label={`Edit ${field}`}
          className={editClassName}
        />
      ) : (
        <input
          ref={controlRef}
          autoFocus
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          aria-label={`Edit ${field}`}
          className={cn(
            "w-full rounded-md border border-line bg-surface-2/40 px-2 py-1 text-foreground outline-none focus:border-neutral-500",
            editClassName,
          )}
        />
      )}
      <div className="flex items-center justify-between gap-3">
        {error ? (
          <p className="text-xs text-red-400">{error}</p>
        ) : (
          <span className="text-xs text-muted">
            {multiline ? "⌘↵ to save" : "↵ to save"} · Esc to cancel
          </span>
        )}
        <div className="flex gap-1">
          <IconButton label={`Save ${field}`} onClick={save}>
            {checkIcon}
          </IconButton>
          <IconButton label={`Cancel editing ${field}`} onClick={cancel}>
            {crossIcon}
          </IconButton>
        </div>
      </div>
    </div>
  );
}
