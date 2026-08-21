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
import { postIncidentUpdate } from "./actions";

export type FeedUpdate = {
  id: string;
  message: string;
  createdAt: Date;
  author: { id: string; name: string } | null;
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
  const [realtimeUpdates, setRealtimeUpdates] = useState<FeedUpdate[]>([]);
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

  const seen = new Set<string>();
  const feed = [...realtimeUpdates, ...initialUpdates, ...pendingUpdates]
    .filter((update) => (seen.has(update.id) ? false : (seen.add(update.id), true)))
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
              formRef.current?.reset();
              addPendingUpdate({
                id,
                message,
                createdAt: new Date(),
                author: currentUser,
                pending: true,
              });
              const result = await postIncidentUpdate({ id, incidentId, message });
              if (result.error) {
                setDraft((current) => ({ key: current.key + 1, value: message }));
                toast.push("error", result.error);
              } else {
                setDraft((current) => ({ key: current.key + 1, value: "" }));
                setComposerOpen(false);
              }
            }}
          >
            <Textarea
              key={draft.key}
              ref={textareaRef}
              defaultValue={draft.value}
              id="update-message"
              name="message"
              aria-label="Add an update"
              required
              maxLength={2000}
              placeholder="Share progress, findings or next steps…"
              onChange={() => broadcastTyping(true)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  cancelComposer();
                }
              }}
            />
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
          <div className="flex items-center gap-3">
            <Avatar name={currentUser.name} />
            <button
              ref={openerRef}
              type="button"
              onClick={() => setComposerOpen(true)}
              className="flex-1 rounded-md border border-line bg-surface-2/40 px-3 py-2.5 text-left text-sm text-neutral-600 transition-colors hover:border-neutral-600"
            >
              Add an update…
            </button>
          </div>
          <p className="pl-10 text-xs text-muted">
            <span className="font-semibold text-neutral-400">Pro tip:</span> press{" "}
            <kbd className="rounded border border-line bg-surface-2 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-neutral-300">
              U
            </kbd>{" "}
            to add an update
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
          {feed.map((update, index) => (
            <li
              key={update.id}
              className={cn(
                "relative flex gap-3 pb-6 last:pb-0",
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
                </p>
                <p className="text-sm leading-relaxed text-neutral-300">
                  {update.message}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
