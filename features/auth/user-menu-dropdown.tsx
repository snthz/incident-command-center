"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const daypartIcons = {
  morning: (
    <svg aria-hidden viewBox="0 0 16 16" className="size-4 text-amber-300/80" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 10.5a3.5 3.5 0 0 1 7 0M1.5 10.5h1.2M13.3 10.5h1.2M3.6 6.1l.8.8M12.4 6.1l-.8.8M8 3v1.7M2 13.5h12" />
      <path d="M6.5 1.8 8 3.3l1.5-1.5" transform="translate(0 -0.3)" />
    </svg>
  ),
  afternoon: (
    <svg aria-hidden viewBox="0 0 16 16" className="size-4 text-amber-300/80" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1" />
    </svg>
  ),
  evening: (
    <svg aria-hidden viewBox="0 0 16 16" className="size-4 text-orange-300/80" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 10.5a3.5 3.5 0 0 1 7 0M1.5 10.5h1.2M13.3 10.5h1.2M3.6 6.1l.8.8M12.4 6.1l-.8.8M2 13.5h12" />
      <path d="M6.5 3.2 8 1.7l1.5 1.5" transform="rotate(180 8 2.85)" />
    </svg>
  ),
  night: (
    <svg aria-hidden viewBox="0 0 16 16" className="size-4 text-indigo-300/70" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.5 9.8A5.7 5.7 0 0 1 6.2 2.5a5.7 5.7 0 1 0 7.3 7.3Z" />
    </svg>
  ),
};

function greetingFor(hour: number): { label: string; part: keyof typeof daypartIcons } {
  if (hour < 5) return { label: "Good night", part: "night" };
  if (hour < 12) return { label: "Good morning", part: "morning" };
  if (hour < 18) return { label: "Good afternoon", part: "afternoon" };
  if (hour < 22) return { label: "Good evening", part: "evening" };
  return { label: "Good night", part: "night" };
}

function Greeting({ name }: { name: string }) {
  const [greeting, setGreeting] = useState<ReturnType<typeof greetingFor> | null>(null);
  const firstName = name.split(" ")[0];

  useEffect(() => {
    const update = () => setGreeting(greetingFor(new Date().getHours()));
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="hidden items-center gap-1.5 text-sm text-muted sm:flex">
      {greeting ? (
        <>
          {`${greeting.label}, ${firstName}`}
          {daypartIcons[greeting.part]}
        </>
      ) : (
        firstName
      )}
    </span>
  );
}

export function UserMenuDropdown({
  name,
  email,
  signOutAction,
}: {
  name: string;
  email?: string;
  signOutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const pendingFocus = useRef<"first" | "last" | null>(null);

  const items = () =>
    Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [],
    );

  useEffect(() => {
    if (!open || !pendingFocus.current) return;
    const all = items();
    (pendingFocus.current === "first" ? all[0] : all[all.length - 1])?.focus();
    pendingFocus.current = null;
  }, [open]);

  const openAndFocus = (position: "first" | "last") => {
    pendingFocus.current = position;
    setOpen(true);
  };

  const onButtonKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openAndFocus("first");
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openAndFocus("last");
    }
  };

  const onMenuKeyDown = (event: React.KeyboardEvent) => {
    const all = items();
    const index = all.indexOf(document.activeElement as HTMLElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      all[(index + 1) % all.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      all[(index - 1 + all.length) % all.length]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      all[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      all[all.length - 1]?.focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative flex items-center gap-3">
      <Greeting name={name} />
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Account: ${name}`}
        onClick={() => (open ? setOpen(false) : openAndFocus("first"))}
        onKeyDown={onButtonKeyDown}
        className="group flex items-center gap-1 rounded-full outline-offset-4"
      >
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-neutral-300 ring-1 ring-line transition-colors group-hover:ring-neutral-500",
            open && "ring-neutral-500",
          )}
        >
          {initialsOf(name)}
        </span>
        <svg
          aria-hidden
          viewBox="0 0 12 12"
          className={cn(
            "size-3 text-muted transition-transform group-hover:text-neutral-300",
            open && "rotate-180 text-neutral-300",
          )}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m3 4.5 3 3 3-3" />
        </svg>
      </button>

      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Account"
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 top-full z-40 mt-2 w-56 overflow-hidden rounded-lg border border-line bg-surface-2 py-1 shadow-lg shadow-black/40"
        >
          <div className="border-b border-line px-3 py-2.5">
            <p className="truncate text-sm font-medium text-foreground">{name}</p>
            {email ? <p className="truncate text-xs text-muted">{email}</p> : null}
          </div>
          <Link
            href="/about-severities"
            role="menuitem"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-neutral-300 outline-none hover:bg-white/5 focus-visible:bg-white/5"
          >
            <svg aria-hidden viewBox="0 0 16 16" className="size-4 text-muted" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 2.5c-1.6-1-3.9-1-5.5-.4v10.4c1.6-.6 3.9-.6 5.5.4 1.6-1 3.9-1 5.5-.4V2.1c-1.6-.6-3.9-.6-5.5.4Z" />
              <path d="M8 2.5v10.4" />
            </svg>
            Severity guide
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              role="menuitem"
              tabIndex={-1}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-neutral-300 outline-none hover:bg-white/5 focus-visible:bg-white/5"
            >
              <svg aria-hidden viewBox="0 0 16 16" className="size-4 text-muted" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2.5H3.5v11H6M10.5 5l3 3-3 3M13 8H6.5" />
              </svg>
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
