"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { TimeAgo } from "@/components/ui/time-ago";
import { useToast } from "@/components/ui/toaster";
import { cn } from "@/lib/cn";
import { createRealtimeClient } from "@/lib/supabase/client";
import { markAllNotificationsRead, markNotificationRead } from "./actions";
import type { NotificationItem } from "./queries";
import type { NotificationType } from "./service";

const verbs: Record<NotificationType, string> = {
  update_posted: "posted an update on",
  status_changed: "changed the status of",
  assigned: "assigned you to",
};

const typeIcons: Record<NotificationType, React.ReactNode> = {
  update_posted: (
    <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.5 8a5.5 5.5 0 0 1-8 4.9L2.5 13.5l.6-3A5.5 5.5 0 1 1 13.5 8Z" />
    </svg>
  ),
  status_changed: (
    <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 5.5h8m0 0L8 3m2.5 2.5L8 8m5.5 2.5h-8m0 0L8 13m-2.5-2.5L8 8" />
    </svg>
  ),
  assigned: (
    <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6.5" cy="5.5" r="2.5" />
      <path d="M2 13.5c.6-2.3 2.4-3.5 4.5-3.5s3.9 1.2 4.5 3.5M12 5v4M14 7h-4" />
    </svg>
  ),
};

const profileNames = new Map<string, string>();

export function NotificationsPanel({
  userId,
  initialItems,
  initialUnread,
}: {
  userId: string;
  initialItems: NotificationItem[];
  initialUnread: number;
}) {
  const [open, setOpen] = useState(false);
  const [liveItems, setLiveItems] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [allReadAt, setAllReadAt] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const toast = useToast();

  const liveOnly = liveItems.filter(
    (item) => !initialItems.some((existing) => existing.id === item.id),
  );
  const merged = [...liveOnly, ...initialItems];
  const items = merged.map((item) => ({
    ...item,
    read:
      item.read ||
      readIds.has(item.id) ||
      (allReadAt !== null && Date.parse(item.createdAt) <= allReadAt),
  }));
  const listedUnread = items.filter((item) => !item.read).length;
  const hiddenUnread =
    allReadAt !== null
      ? 0
      : Math.max(
          0,
          initialUnread - initialItems.filter((item) => !item.read).length,
        );
  const unread = listedUnread + hiddenUnread;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onDocumentKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onDocumentKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    let client: Awaited<ReturnType<typeof createRealtimeClient>> | null = null;

    (async () => {
      const supabase = await createRealtimeClient();
      if (cancelled) return;
      client = supabase;
      channel = supabase
        .channel(`notifications-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `recipient_id=eq.${userId}`,
          },
          async (payload) => {
            const row = payload.new as {
              id: string;
              actor_id: string | null;
              incident_key: string;
              incident_title: string;
              type: NotificationType;
              created_at: string;
            };
            let actorName = row.actor_id ? profileNames.get(row.actor_id) : undefined;
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
            const item: NotificationItem = {
              id: row.id,
              type: row.type,
              incidentKey: row.incident_key,
              incidentTitle: row.incident_title,
              actorName: actorName ?? null,
              createdAt: row.created_at,
              read: false,
            };
            setLiveItems((current) =>
              current.some((existing) => existing.id === item.id)
                ? current
                : [item, ...current],
            );
            const summary = `${item.actorName ?? "Someone"} ${verbs[item.type]} ${item.incidentKey}`;
            setAnnouncement(summary);
            toast.push("success", summary);
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (client && channel) client.removeChannel(channel);
    };
  }, [userId, toast]);

  const openItem = (item: NotificationItem) => {
    setOpen(false);
    if (!item.read) {
      setReadIds((current) => new Set(current).add(item.id));
      void markNotificationRead(item.id);
    }
  };

  const markAll = () => {
    setAllReadAt(Date.now());
    void markAllNotificationsRead();
  };

  return (
    <div ref={containerRef} className="relative">
      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "relative flex size-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/5 hover:text-neutral-200",
          open && "bg-white/5 text-neutral-200",
        )}
      >
        <svg aria-hidden viewBox="0 0 18 18" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 2.5a4.5 4.5 0 0 0-4.5 4.5c0 2.2-.6 3.6-1.3 4.6-.3.5 0 1.1.6 1.1h10.4c.6 0 .9-.6.6-1.1-.7-1-1.3-2.4-1.3-4.6A4.5 4.5 0 0 0 9 2.5ZM7.2 14.8a1.9 1.9 0 0 0 3.6 0" />
        </svg>
        {unread > 0 ? (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[9px] font-bold text-brand-contrast"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label="Notifications"
          tabIndex={-1}
          className="absolute right-0 top-full z-40 mt-2 flex w-87 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border border-line bg-surface-2 shadow-lg shadow-black/40 outline-none"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">Notifications</h2>
            {unread > 0 ? (
              <button
                type="button"
                onClick={markAll}
                className="text-xs text-muted transition-colors hover:text-neutral-200"
              >
                Mark all as read
              </button>
            ) : null}
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">
              You&apos;re all caught up.
            </p>
          ) : (
            <ul className="scroll-slim max-h-96 overflow-y-auto">
              {items.map((item) => (
                <li key={item.id} className="border-b border-line last:border-b-0">
                  <Link
                    href={`/incidents/${item.incidentKey}`}
                    onClick={() => openItem(item)}
                    className={cn(
                      "flex gap-3 px-4 py-3 transition-colors hover:bg-white/5",
                      !item.read && "bg-brand/[0.04]",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 shrink-0",
                        item.read ? "text-muted" : "text-brand",
                      )}
                    >
                      {typeIcons[item.type]}
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm leading-snug text-neutral-300">
                        <span className="font-medium text-foreground">
                          {item.actorName ?? "Someone"}
                        </span>{" "}
                        {verbs[item.type]}{" "}
                        <span className="font-mono text-xs">{item.incidentKey}</span>
                      </span>
                      <span className="truncate text-xs text-muted">
                        {item.incidentTitle}
                      </span>
                      <TimeAgo
                        date={new Date(item.createdAt)}
                        className="text-xs text-muted"
                      />
                    </span>
                    {!item.read ? (
                      <span className="ml-auto mt-1.5 flex shrink-0 items-center" aria-hidden>
                        <span className="size-2 rounded-full bg-brand" />
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
