"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toaster";
import { createIncident, type CreateIncidentState } from "../actions";
import { assigneeOptions } from "./assignee-options";
import type { ProfileOption, ProjectItem } from "../queries";
import { severityLabels, severityValues } from "../schema";

function projectOptions(projects: ProjectItem[]) {
  return projects.map((project) => ({
    value: project.id,
    label: project.name,
    icon: (
      <span
        aria-hidden
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: project.color }}
      />
    ),
  }));
}

const initialState: CreateIncidentState = {};

const rowIcons = {
  project: (
    <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 4h1M6 4h7.5M2.5 8h1M6 8h7.5M2.5 12h1M6 12h7.5" />
    </svg>
  ),
  severity: (
    <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 14V2.5m0 .8c1.5-1 3.4-1 5 0s3.4 1 5 0v6.4c-1.6 1-3.4 1-5 0s-3.5-1-5 0" />
    </svg>
  ),
  assignee: (
    <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5.5" cy="5.5" r="2.3" />
      <path d="M1.5 13.5c.6-2.2 2.2-3.3 4-3.3s3.4 1.1 4 3.3" />
      <circle cx="11.5" cy="6" r="1.9" />
      <path d="M10.8 10.4c1.7.1 3.2 1.1 3.7 3.1" />
    </svg>
  ),
  dueDate: (
    <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
      <path d="M5.5 2v3M10.5 2v3M2.5 7h11" />
    </svg>
  ),
};

function SheetRow({
  icon,
  label,
  id,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[118px_1fr] items-center gap-3">
      <label
        id={`${id}-label`}
        htmlFor={id}
        className="flex items-center gap-2 text-sm text-muted"
      >
        {icon}
        {label}
      </label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function NewIncidentSheet({
  profiles,
  projects,
  defaultProjectId,
}: {
  profiles: ProfileOption[];
  projects: ProjectItem[];
  defaultProjectId?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createIncident, initialState);
  const initialProjectId = defaultProjectId ?? projects[0]?.id ?? "";
  const [projectId, setProjectId] = useState(initialProjectId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [ownerId, setOwnerId] = useState("");
  const [dueDate, setDueDate] = useState("");
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
      setProjectId(initialProjectId);
      setTitle("");
      setDescription("");
      setSeverity("medium");
      setOwnerId("");
      setDueDate("");
      setOpen(false);
    }
  }, [state.createdKey, toast, initialProjectId]);

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

            <div className="flex flex-col gap-3.5">
              <input type="hidden" name="projectId" value={projectId} />
              <SheetRow icon={rowIcons.project} label="Project" id={`${baseId}-project`}>
                <Select
                  id={`${baseId}-project`}
                  labelId={`${baseId}-project-label`}
                  className="w-full"
                  options={projectOptions(projects)}
                  value={projectId}
                  onChange={setProjectId}
                />
              </SheetRow>

              <input type="hidden" name="severity" value={severity} />
              <SheetRow icon={rowIcons.severity} label="Severity" id={`${baseId}-severity`}>
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
              </SheetRow>

              <input type="hidden" name="ownerId" value={ownerId} />
              <SheetRow icon={rowIcons.assignee} label="Assignee" id={`${baseId}-assignee`}>
                <Select
                  id={`${baseId}-assignee`}
                  labelId={`${baseId}-assignee-label`}
                  className="w-full"
                  searchable
                  searchPlaceholder="Search people…"
                  options={assigneeOptions(profiles)}
                  value={ownerId}
                  onChange={setOwnerId}
                />
              </SheetRow>

              <input type="hidden" name="dueDate" value={dueDate} />
              <SheetRow icon={rowIcons.dueDate} label="Due date" id={`${baseId}-due`}>
                <DatePicker
                  id={`${baseId}-due`}
                  labelId={`${baseId}-due-label`}
                  value={dueDate}
                  onChange={setDueDate}
                  placeholder="No due date"
                />
              </SheetRow>
            </div>

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
