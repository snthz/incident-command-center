"use client";

// Custom calendar (no native input[type=date]): Monday-first grid, arrow-key
// navigation that crosses month boundaries, Today/Clear footer. Values are
// plain yyyy-mm-dd strings — timezone handling happens at the schema layer.

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type Cell = { iso: string; day: number; inMonth: boolean };

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function isoOf(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function todayIso() {
  const now = new Date();
  return isoOf(now.getFullYear(), now.getMonth(), now.getDate());
}

function monthGrid(year: number, month: number): Cell[] {
  const first = new Date(Date.UTC(year, month, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const cells: Cell[] = [];
  for (let index = 0; index < 42; index++) {
    const date = new Date(Date.UTC(year, month, 1 - offset + index));
    cells.push({
      iso: isoOf(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === month,
    });
  }
  return cells;
}

function formatDisplay(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${iso}T12:00:00Z`));
}

const triggerVariants = {
  outline:
    "border border-line bg-surface-2 text-foreground hover:border-neutral-600",
  ghost:
    "border border-transparent bg-transparent text-muted hover:bg-white/5 hover:text-foreground",
};

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  clearable = true,
  disabled,
  variant = "outline",
  align = "start",
  className,
  triggerClassName,
  id,
  labelId,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  clearable?: boolean;
  disabled?: boolean;
  variant?: keyof typeof triggerVariants;
  align?: "start" | "end";
  className?: string;
  triggerClassName?: string;
  id?: string;
  labelId?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    const base = value ? new Date(`${value}T12:00:00Z`) : new Date();
    return { year: base.getFullYear(), month: base.getMonth() };
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const dialogId = useId();
  const today = todayIso();

  const cells = monthGrid(view.year, view.month);

  function openPicker() {
    const base = value ? new Date(`${value}T12:00:00Z`) : new Date();
    setView({ year: base.getFullYear(), month: base.getMonth() });
    setOpen(true);
  }

  function close(returnFocus = true) {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  function commit(iso: string) {
    close();
    if (iso !== value) onChange(iso);
  }

  function shiftMonth(delta: number) {
    setView((current) => {
      const date = new Date(Date.UTC(current.year, current.month + delta, 1));
      return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
    });
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const target =
      gridRef.current?.querySelector<HTMLButtonElement>(
        "[data-selected=true]",
      ) ??
      gridRef.current?.querySelector<HTMLButtonElement>("[data-today=true]") ??
      gridRef.current?.querySelector<HTMLButtonElement>("[data-inmonth=true]");
    target?.focus();
  }, [open, view]);

  function moveFocus(deltaDays: number) {
    const active = document.activeElement as HTMLElement | null;
    const iso = active?.dataset.iso;
    if (!iso) return;
    const next = new Date(`${iso}T12:00:00Z`);
    next.setUTCDate(next.getUTCDate() + deltaDays);
    const nextIso = isoOf(
      next.getUTCFullYear(),
      next.getUTCMonth(),
      next.getUTCDate(),
    );
    const button = gridRef.current?.querySelector<HTMLButtonElement>(
      `[data-iso="${nextIso}"]`,
    );
    if (button) {
      button.focus();
    } else {
      setView({ year: next.getUTCFullYear(), month: next.getUTCMonth() });
      requestAnimationFrame(() => {
        gridRef.current
          ?.querySelector<HTMLButtonElement>(`[data-iso="${nextIso}"]`)
          ?.focus();
      });
    }
  }

  function onGridKeyDown(event: React.KeyboardEvent) {
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        moveFocus(-1);
        break;
      case "ArrowRight":
        event.preventDefault();
        moveFocus(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveFocus(-7);
        break;
      case "ArrowDown":
        event.preventDefault();
        moveFocus(7);
        break;
      case "Escape":
        event.preventDefault();
        close();
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        aria-label={labelId ? undefined : ariaLabel}
        aria-labelledby={labelId}
        onClick={() => (open ? close(false) : openPicker())}
        onKeyDown={(event) => {
          if (event.key === "Escape" && open) {
            event.preventDefault();
            close();
          }
        }}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-md px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60",
          triggerVariants[variant],
          triggerClassName,
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <svg aria-hidden viewBox="0 0 16 16" className="size-4 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
            <path d="M5.5 2v3M10.5 2v3M2.5 7h11" />
          </svg>
          <span className={cn("truncate", !value && "text-muted")}>
            {value ? formatDisplay(value) : placeholder}
          </span>
        </span>
        <svg
          aria-hidden
          viewBox="0 0 12 12"
          className={cn("size-3 shrink-0 text-muted transition-transform", open && "rotate-180")}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2.5 4.5 6 8l3.5-3.5" />
        </svg>
      </button>

      {open ? (
        <div
          id={dialogId}
          role="dialog"
          aria-label="Choose date"
          className={cn(
            "absolute top-full z-30 mt-1.5 w-64 rounded-lg border border-line bg-surface-2 p-3 shadow-xl",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => shiftMonth(-1)}
              className="flex size-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-white/5 hover:text-foreground"
            >
              <svg aria-hidden viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7.5 2.5 4 6l3.5 3.5" />
              </svg>
            </button>
            <p aria-live="polite" className="text-sm font-medium text-foreground">
              {MONTHS[view.month]} {view.year}
            </p>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => shiftMonth(1)}
              className="flex size-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-white/5 hover:text-foreground"
            >
              <svg aria-hidden viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.5 2.5 8 6l-3.5 3.5" />
              </svg>
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7">
            {WEEKDAYS.map((weekday) => (
              <span
                key={weekday}
                aria-hidden
                className="flex h-7 items-center justify-center text-[10px] font-medium uppercase text-muted"
              >
                {weekday}
              </span>
            ))}
          </div>

          <div ref={gridRef} onKeyDown={onGridKeyDown} className="grid grid-cols-7">
            {cells.map((cell) => (
              <button
                key={cell.iso}
                type="button"
                tabIndex={-1}
                data-iso={cell.iso}
                data-inmonth={cell.inMonth || undefined}
                data-today={cell.iso === today || undefined}
                data-selected={cell.iso === value || undefined}
                aria-label={formatDisplay(cell.iso)}
                aria-pressed={cell.iso === value}
                onClick={() => commit(cell.iso)}
                className={cn(
                  "flex size-8 items-center justify-center rounded-md text-sm transition-colors",
                  cell.inMonth ? "text-neutral-300" : "text-neutral-600",
                  cell.iso === value
                    ? "bg-brand font-semibold text-brand-contrast"
                    : "hover:bg-white/5",
                  cell.iso === today && cell.iso !== value && "ring-1 ring-inset ring-neutral-500",
                )}
              >
                {cell.day}
              </button>
            ))}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
            <button
              type="button"
              onClick={() => commit(today)}
              className="rounded-md px-2 py-1 text-xs text-muted transition-colors hover:bg-white/5 hover:text-foreground"
            >
              Today
            </button>
            {clearable && value ? (
              <button
                type="button"
                onClick={() => {
                  close();
                  onChange("");
                }}
                className="rounded-md px-2 py-1 text-xs text-muted transition-colors hover:bg-white/5 hover:text-foreground"
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
