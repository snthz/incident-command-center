"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toaster";
import { createIncident, type CreateIncidentState } from "./actions";
import { assigneeOptions } from "./assignee-options";
import type { ProfileOption } from "./queries";
import { severityLabels, severityValues } from "./schema";

const initialState: CreateIncidentState = {};

function SheetField({
  label,
  children,
  id,
}: {
  label: string;
  children: React.ReactNode;
  id: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label id={`${id}-label`} htmlFor={id} className="text-sm text-neutral-300">
        {label}
      </label>
      {children}
    </div>
  );
}

export function NewIncidentSheet({ profiles }: { profiles: ProfileOption[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createIncident, initialState);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [ownerId, setOwnerId] = useState("");
  const lastCreatedRef = useRef<string | null>(null);
  const toast = useToast();
  const baseId = useId();
  const headingId = `${baseId}-heading`;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (state.createdKey && state.createdKey !== lastCreatedRef.current) {
      lastCreatedRef.current = state.createdKey;
      toast.push("success", `${state.createdKey} created`);
      setTitle("");
      setDescription("");
      setSeverity("medium");
      setOwnerId("");
      setOpen(false);
    }
  }, [state.createdKey, toast]);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <span className="flex items-center gap-1.5">
          <svg aria-hidden viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M6 2v8M2 6h8" />
          </svg>
          New incident
        </span>
      </Button>

      <dialog
        ref={dialogRef}
        aria-labelledby={headingId}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === dialogRef.current) setOpen(false);
        }}
        className="sheet fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-full max-w-md border-l border-line bg-surface p-0 text-foreground shadow-2xl shadow-black/60 backdrop:bg-black/60"
      >
        <form action={formAction} noValidate className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 id={headingId} className="text-base font-semibold text-foreground">
              New incident
            </h2>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="flex size-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-white/5 hover:text-neutral-200"
            >
              <svg aria-hidden viewBox="0 0 12 12" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="m2.5 2.5 7 7m0-7-7 7" />
              </svg>
            </button>
          </div>

          <div className="scroll-slim flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
            <TextField
              label="Title"
              name="title"
              placeholder="Short summary of what is failing"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              error={state.fieldErrors?.title}
            />

            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${baseId}-description`} className="text-sm text-neutral-300">
                Description
              </label>
              <Textarea
                id={`${baseId}-description`}
                name="description"
                rows={5}
                placeholder="Impact, scope and anything the team should know to start responding"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                aria-invalid={state.fieldErrors?.description ? true : undefined}
                aria-describedby={
                  state.fieldErrors?.description ? `${baseId}-description-error` : undefined
                }
              />
              {state.fieldErrors?.description ? (
                <p id={`${baseId}-description-error`} className="text-xs text-red-400">
                  {state.fieldErrors.description}
                </p>
              ) : null}
            </div>

            <input type="hidden" name="severity" value={severity} />
            <SheetField label="Severity" id={`${baseId}-severity`}>
              <Select
                id={`${baseId}-severity`}
                labelId={`${baseId}-severity-label`}
                className="w-full"
                options={severityValues.map((value) => ({
                  value,
                  label: severityLabels[value],
                }))}
                value={severity}
                onChange={setSeverity}
              />
            </SheetField>

            <input type="hidden" name="ownerId" value={ownerId} />
            <SheetField label="Assignee" id={`${baseId}-assignee`}>
              <Select
                id={`${baseId}-assignee`}
                labelId={`${baseId}-assignee-label`}
                className="w-full"
                options={assigneeOptions(profiles)}
                value={ownerId}
                onChange={setOwnerId}
              />
            </SheetField>

            {state.error ? (
              <p
                role="alert"
                className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
              >
                {state.error}
              </p>
            ) : null}
          </div>

          <div className="flex justify-end gap-3 border-t border-line px-5 py-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create incident"}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
