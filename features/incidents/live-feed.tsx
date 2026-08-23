"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect, useOptimistic, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LiveBadge, type LiveConnectionState } from "@/components/ui/live-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { TimeAgo } from "@/components/ui/time-ago";
import { useToast } from "@/components/ui/toaster";
import { cn } from "@/lib/cn";
import { createRealtimeClient } from "@/lib/supabase/client";
import {
  deleteIncidentUpdate,
  editIncidentUpdate,
  postIncidentUpdate,
  removeIncidentAttachment,
} from "./actions";
import {
  AttachmentRow,
  PaperclipIcon,
  formatBytes,
  uploadAttachmentFile,
  validateAttachment,
  type AttachmentItemData,
} from "./attachments";
import { MAX_ATTACHMENTS_PER_POST } from "./schema";

export type FeedUpdate = {
  id: string;
  message: string;
  createdAt: Date;
  editedAt?: Date | null;
  author: { id: string; name: string } | null;
  attachments?: AttachmentItemData[];
  pending?: boolean;
};

type FeedUser = { id: string; name: string };

const profileNames = new Map<string, string>();

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save"}
    </Button>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className="flex size-7 shrink-0 items-center justify-center rounded-full border border-line bg-surface-2 text-[10px] font-semibold text-neutral-300"
    >
      {initialsOf(name)}
    </span>
  );
}

export function LiveFeed({
  incidentId,
  currentUser,
  initialUpdates,
}: {
  incidentId: string;
  currentUser: FeedUser;
  initialUpdates: FeedUpdate[];
}) {
  const router = useRouter();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const hadErrorRef = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastTypingSentRef = useRef(0);
  const typingTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const [typingPeers, setTypingPeers] = useState(0);
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState({ key: 0, value: "" });
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Attachments arriving over realtime for updates whose server props
  // don't carry them yet (the refresh lands ~600ms later).
  const [liveAttachments, setLiveAttachments] = useState<
    Map<string, AttachmentItemData[]>
  >(new Map());
  const [realtimeUpdates, setRealtimeUpdates] = useState<FeedUpdate[]>([]);
  // Own edits/deletes apply optimistically; foreign ones arrive over realtime.
  // Both land here so server props can lag behind without visual flicker.
  const [editedOverrides, setEditedOverrides] = useState<
    Map<string, { message: string; editedAt: Date }>
  >(new Map());
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<Set<string>>(
    new Set(),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [connection, setConnection] = useState<LiveConnectionState>("connecting");
  const [announcement, setAnnouncement] = useState("");
  const [pendingUpdates, addPendingUpdate] = useOptimistic<FeedUpdate[], FeedUpdate>(
    [],
    (current, update) => [update, ...current],
  );

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | null = null;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => router.refresh(), 600);
    };

    (async () => {
      const supabase = await createRealtimeClient();
      if (cancelled) return;
      const channel = supabase
        .channel(`incident-updates-${incidentId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "incidents",
            filter: `id=eq.${incidentId}`,
          },
          scheduleRefresh,
        )
        .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "incident_updates",
          filter: `incident_id=eq.${incidentId}`,
        },
        async (payload) => {
          const row = payload.new as {
            id: string;
            author_id: string | null;
            message: string;
            created_at: string;
          };
          let name = row.author_id ? profileNames.get(row.author_id) : undefined;
          if (row.author_id && name === undefined) {
            const { data } = await supabase
              .from("profiles")
              .select("name")
              .eq("id", row.author_id)
              .single();
            if (data?.name) {
              name = data.name;
              profileNames.set(row.author_id, data.name);
            }
          }
          const update: FeedUpdate = {
            id: row.id,
            message: row.message,
            createdAt: new Date(row.created_at),
            author: row.author_id
              ? { id: row.author_id, name: name ?? "Team member" }
              : null,
          };
          setRealtimeUpdates((current) =>
            current.some((item) => item.id === update.id)
              ? current
              : [update, ...current],
          );
          scheduleRefresh();
          if (row.author_id !== currentUser.id) {
            setAnnouncement(
              `New update from ${update.author?.name ?? "the team"}`,
            );
          }
        },
      )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "incident_updates",
            filter: `incident_id=eq.${incidentId}`,
          },
          (payload) => {
            const row = payload.new as {
              id: string;
              message: string;
              edited_at: string | null;
            };
            setEditedOverrides((current) => {
              const next = new Map(current);
              next.set(row.id, {
                message: row.message,
                editedAt: row.edited_at ? new Date(row.edited_at) : new Date(),
              });
              return next;
            });
            scheduleRefresh();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "incident_updates",
            filter: `incident_id=eq.${incidentId}`,
          },
          (payload) => {
            const row = payload.old as { id?: string };
            if (row?.id) {
              const removedId = row.id;
              setDeletedIds((current) => new Set(current).add(removedId));
            }
            scheduleRefresh();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "incident_attachments",
            filter: `incident_id=eq.${incidentId}`,
          },
          (payload) => {
            const row = payload.new as {
              id: string;
              update_id: string | null;
              file_name: string;
              file_path: string;
              mime_type: string;
              size_bytes: number;
            };
            if (row.update_id) {
              const updateId = row.update_id;
              setLiveAttachments((current) => {
                const existing = current.get(updateId) ?? [];
                if (existing.some((item) => item.id === row.id)) return current;
                const next = new Map(current);
                next.set(updateId, [
                  ...existing,
                  {
                    id: row.id,
                    fileName: row.file_name,
                    filePath: row.file_path,
                    mimeType: row.mime_type,
                    sizeBytes: Number(row.size_bytes),
                  },
                ]);
                return next;
              });
            }
            scheduleRefresh();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "incident_attachments",
            filter: `incident_id=eq.${incidentId}`,
          },
          (payload) => {
            const row = payload.old as { id?: string };
            if (row?.id) {
              const removedId = row.id;
              setRemovedAttachmentIds((current) =>
                new Set(current).add(removedId),
              );
            }
            scheduleRefresh();
          },
        )
        .on("broadcast", { event: "typing" }, (message) => {
          const { userId, typing } = message.payload as {
            userId: string;
            typing: boolean;
          };
          if (userId === currentUser.id) return;
          const timers = typingTimersRef.current;
          const existing = timers.get(userId);
          if (existing) clearTimeout(existing);
          if (typing) {
            timers.set(
              userId,
              setTimeout(() => {
                timers.delete(userId);
                setTypingPeers(timers.size);
              }, 4000),
            );
          } else {
            timers.delete(userId);
          }
          setTypingPeers(timers.size);
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            setConnection("live");
            if (hadErrorRef.current) {
              hadErrorRef.current = false;
              router.refresh();
            }
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            hadErrorRef.current = true;
            setConnection("reconnecting");
          }
        });

      channelRef.current = channel;
      cleanup = () => {
        channelRef.current = null;
        supabase.removeChannel(channel);
      };
    })();

    const timers = typingTimersRef.current;
    return () => {
      cancelled = true;
      if (refreshTimer) clearTimeout(refreshTimer);
      cleanup?.();
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, [incidentId, currentUser.id, router]);

  // Throttled to one broadcast per 1.5s; receivers expire peers after 4s.
  function broadcastTyping(typing: boolean) {
    const channel = channelRef.current;
    if (!channel) return;
    const now = Date.now();
    if (typing && now - lastTypingSentRef.current < 1500) return;
    lastTypingSentRef.current = typing ? now : 0;
    channel.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: currentUser.id, typing },
    });
  }

  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (composerOpen) {
      wasOpenRef.current = true;
      textareaRef.current?.focus();
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false;
      openerRef.current?.focus();
    }
  }, [composerOpen, draft.key]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "u") return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable], [role=combobox]")) {
        return;
      }
      event.preventDefault();
      setComposerOpen(true);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function cancelComposer() {
    const value = textareaRef.current?.value ?? "";
    broadcastTyping(false);
    setDraft((current) => ({ key: current.key + 1, value }));
    setComposerOpen(false);
  }

  function startEdit(update: FeedUpdate, message: string) {
    setConfirmingId(null);
    setEditingId(update.id);
    setEditDraft(message);
  }

  async function saveEdit(update: FeedUpdate, currentMessage: string) {
    const next = editDraft.trim();
    setEditingId(null);
    if (!next || next === currentMessage) return;
    const previous = editedOverrides.get(update.id);
    setEditedOverrides((current) =>
      new Map(current).set(update.id, { message: next, editedAt: new Date() }),
    );
    const result = await editIncidentUpdate({ id: update.id, message: next });
    if (result.error) {
      setEditedOverrides((current) => {
        const reverted = new Map(current);
        if (previous) {
          reverted.set(update.id, previous);
        } else {
          reverted.delete(update.id);
        }
        return reverted;
      });
      toast.push("error", result.error);
    } else {
      toast.push("success", "Comment updated");
      router.refresh();
    }
  }

  async function removeComment(update: FeedUpdate) {
    setConfirmingId(null);
    setDeletedIds((current) => new Set(current).add(update.id));
    const result = await deleteIncidentUpdate({ id: update.id });
    if (result.error) {
      setDeletedIds((current) => {
        const reverted = new Set(current);
        reverted.delete(update.id);
        return reverted;
      });
      toast.push("error", result.error);
    } else {
      toast.push("success", "Comment deleted");
      router.refresh();
    }
  }

  async function removeCommentAttachment(attachment: AttachmentItemData) {
    setRemovedAttachmentIds((current) => new Set(current).add(attachment.id));
    const result = await removeIncidentAttachment({ id: attachment.id });
    if (result.error) {
      setRemovedAttachmentIds((current) => {
        const reverted = new Set(current);
        reverted.delete(attachment.id);
        return reverted;
      });
      toast.push("error", result.error);
    } else {
      toast.push("success", `${attachment.fileName} removed`);
      router.refresh();
    }
  }

  // Realtime, server-rendered and optimistic items overlap after a refresh —
  // merge by id, newest first.
  const seen = new Set<string>();
  const feed = [...realtimeUpdates, ...initialUpdates, ...pendingUpdates]
    .filter((update) => (seen.has(update.id) ? false : (seen.add(update.id), true)))
    .filter((update) => !deletedIds.has(update.id))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <div className="flex flex-col gap-5">
      {connection === "reconnecting" ? (
        <div className="flex justify-end">
          <LiveBadge state="reconnecting" />
        </div>
      ) : null}

      {composerOpen ? (
        <div className="flex gap-3">
          <Avatar name={currentUser.name} />
          <form
            ref={formRef}
            className="flex flex-1 flex-col gap-2"
            action={async (formData) => {
              const message = String(formData.get("message") ?? "").trim();
              if (!message) return;
              const id = crypto.randomUUID();
              broadcastTyping(false);

              // Upload before creating the update so the action can link
              // the attachment rows to it in one write.
              let attachments: AttachmentItemData[] = [];
              if (files.length) {
                try {
                  const metas = await Promise.all(
                    files.map((file) => uploadAttachmentFile(file, incidentId)),
                  );
                  attachments = metas.map((meta) => ({
                    ...meta,
                    id: crypto.randomUUID(),
                  }));
                } catch {
                  toast.push("error", "Could not upload the attachments. Try again.");
                  return;
                }
              }

              formRef.current?.reset();
              addPendingUpdate({
                id,
                message,
                createdAt: new Date(),
                author: currentUser,
                attachments,
                pending: true,
              });
              const result = await postIncidentUpdate({
                id,
                incidentId,
                message,
                attachments: attachments.map((attachment) => ({
                  fileName: attachment.fileName,
                  filePath: attachment.filePath,
                  mimeType: attachment.mimeType,
                  sizeBytes: attachment.sizeBytes,
                })),
              });
              if (result.error) {
                setDraft((current) => ({ key: current.key + 1, value: message }));
                toast.push("error", result.error);
              } else {
                setDraft((current) => ({ key: current.key + 1, value: "" }));
                setFiles([]);
                setComposerOpen(false);
              }
            }}
          >
            <div className="relative">
              <Textarea
                key={draft.key}
                ref={textareaRef}
                defaultValue={draft.value}
                id="update-message"
                name="message"
                aria-label="Add a comment"
                required
                maxLength={2000}
                placeholder="Share progress, findings or next steps…"
                className="pb-10"
                onChange={() => broadcastTyping(true)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    cancelComposer();
                  }
                }}
              />
              <button
                type="button"
                aria-label="Attach files"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-2 left-2 flex size-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-white/5 hover:text-neutral-200"
              >
                <PaperclipIcon />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                hidden
                aria-label="Attach files to the comment"
                onChange={(event) => {
                  const selected = Array.from(event.target.files ?? []);
                  event.target.value = "";
                  setFiles((current) => {
                    const next = [...current];
                    for (const file of selected) {
                      if (next.length >= MAX_ATTACHMENTS_PER_POST) {
                        toast.push("error", `Up to ${MAX_ATTACHMENTS_PER_POST} files per comment`);
                        break;
                      }
                      const invalid = validateAttachment(file);
                      if (invalid) {
                        toast.push("error", invalid);
                        continue;
                      }
                      next.push(file);
                    }
                    return next;
                  });
                }}
              />
            </div>
            {files.length ? (
              <ul aria-label="Files to attach" className="flex flex-col gap-1.5">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className="flex items-center gap-2 rounded-md border border-line bg-surface-2/40 px-2.5 py-1.5 text-sm"
                  >
                    <PaperclipIcon className="size-3.5 shrink-0 text-muted" />
                    <span className="min-w-0 flex-1 truncate text-neutral-200">
                      {file.name}
                    </span>
                    <span className="shrink-0 text-xs text-muted">
                      {formatBytes(file.size)}
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${file.name}`}
                      onClick={() =>
                        setFiles((current) => current.filter((_, i) => i !== index))
                      }
                      className="flex size-5 shrink-0 items-center justify-center rounded text-muted transition-colors hover:bg-white/5 hover:text-neutral-200"
                    >
                      <svg aria-hidden viewBox="0 0 12 12" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <path d="m2.5 2.5 7 7m0-7-7 7" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="flex items-center gap-1">
              <SubmitButton />
              <Button type="button" variant="ghost" onClick={cancelComposer}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-start gap-3">
            <Avatar name={currentUser.name} />
            <button
              ref={openerRef}
              type="button"
              onClick={() => setComposerOpen(true)}
              className="flex min-h-24 flex-1 items-start rounded-md border border-line bg-surface-2/40 px-3 py-2.5 text-left text-sm text-neutral-600 transition-colors hover:border-neutral-600"
            >
              Add a comment…
            </button>
          </div>
          <p className="pl-10 text-xs text-muted">
            <span className="font-semibold text-neutral-400">Pro tip:</span> press{" "}
            <kbd className="rounded border border-line bg-surface-2 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-neutral-300">
              U
            </kbd>{" "}
            to comment
          </p>
        </div>
      )}

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {typingPeers > 0 ? (
        <div aria-hidden className="flex gap-3">
          <span className="size-7 shrink-0 animate-pulse rounded-full border border-line bg-surface-2" />
          <div className="flex flex-1 flex-col gap-2 pt-0.5">
            <p className="text-xs italic text-muted">
              {typingPeers > 1
                ? "Team members are writing updates…"
                : "Someone is writing an update…"}
            </p>
            <Skeleton className="h-3.5 w-full max-w-md" />
            <Skeleton className="h-3.5 w-2/5" />
          </div>
        </div>
      ) : null}

      {feed.length === 0 ? (
        <EmptyState
          title="No updates yet"
          description="Activity will appear here as the team posts updates."
        />
      ) : (
        <ol aria-label="Incident updates" className="flex flex-col">
          {feed.map((update, index) => {
            const override = editedOverrides.get(update.id);
            const message = override?.message ?? update.message;
            const editedAt = override?.editedAt ?? update.editedAt;
            const isOwn = !update.pending && update.author?.id === currentUser.id;
            const isEditing = editingId === update.id;
            const attachments = (
              update.attachments?.length
                ? update.attachments
                : (liveAttachments.get(update.id) ?? [])
            ).filter((attachment) => !removedAttachmentIds.has(attachment.id));
            return (
              <li
                key={update.id}
                className={cn(
                  "group relative flex gap-3 pb-6 last:pb-0",
                  update.pending && "opacity-60",
                )}
              >
                {index < feed.length - 1 ? (
                  <span
                    aria-hidden
                    className="absolute left-3.5 top-7 h-full w-px bg-line"
                  />
                ) : null}
                <span
                  aria-hidden
                  className="z-10 flex size-7 shrink-0 items-center justify-center rounded-full border border-line bg-surface-2 text-[10px] font-semibold text-neutral-300"
                >
                  {update.author ? initialsOf(update.author.name) : "?"}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
                  <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                    <span className="font-medium text-foreground">
                      {update.author?.name ?? "Former member"}
                    </span>
                    {update.pending ? (
                      <span className="text-xs text-muted">Sending…</span>
                    ) : (
                      <TimeAgo date={update.createdAt} className="text-xs text-muted" />
                    )}
                    {editedAt && !update.pending ? (
                      <span className="text-xs italic text-muted">Edited</span>
                    ) : null}
                    {isOwn && !isEditing ? (
                      <span className="ml-auto flex gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                        <button
                          type="button"
                          aria-label="Edit comment"
                          onClick={() => startEdit(update, message)}
                          className="flex size-6 items-center justify-center rounded text-muted transition-colors hover:bg-white/5 hover:text-neutral-200"
                        >
                          <svg aria-hidden viewBox="0 0 14 14" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m9.5 2.6 2 2L5 11l-2.6.6L3 9l6.5-6.4ZM8.4 3.7l1.9 1.9" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          aria-label="Delete comment"
                          onClick={() => {
                            setEditingId(null);
                            setConfirmingId(update.id);
                          }}
                          className="flex size-6 items-center justify-center rounded text-muted transition-colors hover:bg-white/5 hover:text-red-400"
                        >
                          <svg aria-hidden viewBox="0 0 14 14" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2.5 4h9M5.5 4V2.8h3V4M3.5 4l.5 7.5h6L10.5 4M5.8 6v3.5M8.2 6v3.5" />
                          </svg>
                        </button>
                      </span>
                    ) : null}
                  </p>
                  {isEditing ? (
                    <div className="flex flex-col gap-2">
                      <Textarea
                        autoFocus
                        value={editDraft}
                        aria-label="Edit comment"
                        maxLength={2000}
                        onChange={(event) => setEditDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            event.preventDefault();
                            setEditingId(null);
                          } else if (
                            event.key === "Enter" &&
                            (event.metaKey || event.ctrlKey)
                          ) {
                            event.preventDefault();
                            saveEdit(update, message);
                          }
                        }}
                      />
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          className="px-2.5 py-1"
                          onClick={() => saveEdit(update, message)}
                        >
                          Save
                        </Button>
                        <Button
                          type="button"
                          className="px-2.5 py-1"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </Button>
                        <span className="ml-1 text-xs text-muted">
                          ⌘↵ to save · Esc to cancel
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-300">
                      {message}
                    </p>
                  )}
                  {attachments.length ? (
                    <ul aria-label="Attachments" className="mt-1 flex max-w-md flex-col gap-1.5">
                      {attachments.map((attachment) => (
                        <AttachmentRow
                          key={attachment.id}
                          attachment={attachment}
                          compact
                          onRemove={
                            isOwn
                              ? () => removeCommentAttachment(attachment)
                              : undefined
                          }
                        />
                      ))}
                    </ul>
                  ) : null}
                  {confirmingId === update.id ? (
                    <div className="mt-1 flex items-center gap-2 rounded-md border border-red-500/25 bg-red-500/5 px-3 py-2">
                      <span className="flex-1 text-sm text-neutral-300">
                        Delete this comment?
                      </span>
                      <Button
                        type="button"
                        onClick={() => removeComment(update)}
                        className="bg-red-500/80 px-2.5 py-1 text-white hover:bg-red-500"
                      >
                        Delete
                      </Button>
                      <Button
                        type="button"
                        className="px-2.5 py-1"
                        variant="ghost"
                        onClick={() => setConfirmingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
