"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export type SelectOption = {
  value: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
};

const triggerSizes = {
  md: "gap-2 rounded-md px-3 py-1.5 text-sm",
  sm: "gap-1.5 rounded px-2 py-1 text-xs",
};

const triggerVariants = {
  outline:
    "border border-line bg-surface-2 text-foreground hover:border-neutral-600",
  ghost:
    "border border-transparent bg-transparent text-muted hover:bg-white/5 hover:text-foreground",
};

const optionSizes = {
  md: "px-3 py-1.5 text-sm",
  sm: "px-2.5 py-1 text-xs",
};

type SelectProps = {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  size?: keyof typeof triggerSizes;
  variant?: keyof typeof triggerVariants;
  align?: "start" | "end";
  /** Side the list opens toward; use "top" when the trigger sits near the
   *  bottom of its container. */
  placement?: "bottom" | "top";
  className?: string;
  id?: string;
  labelId?: string;
  "aria-label"?: string;
  iconOnly?: React.ReactNode;
  searchable?: boolean;
  searchPlaceholder?: string;
};

// Custom combobox/listbox following the APG pattern: arrow/Home/End
// navigation, Escape returns focus to the trigger, aria-activedescendant
// tracks the highlight. `searchable` filters options by label + description;
// `iconOnly` renders a compact trigger for filter bars.
export function Select({
  options,
  value,
  onChange,
  disabled,
  size = "md",
  variant = "outline",
  align = "start",
  placement = "bottom",
  className,
  id,
  labelId,
  "aria-label": ariaLabel,
  iconOnly,
  searchable = false,
  searchPlaceholder = "Search…",
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLLIElement | null>>([]);
  const typeahead = useRef({ text: "", at: 0 });
  const listboxId = useId();

  const query = search.trim().toLowerCase();
  const visible =
    searchable && query
      ? options.filter(
          (option) =>
            option.label.toLowerCase().includes(query) ||
            option.description?.toLowerCase().includes(query),
        )
      : options;

  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const selected = options[selectedIndex];

  function openList() {
    setSearch("");
    setHighlighted(selectedIndex);
    setOpen(true);
  }

  function commit(index: number) {
    setOpen(false);
    const option = visible[index];
    if (searchable) triggerRef.current?.focus();
    if (option && option.value !== value) onChange(option.value);
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
    if (open && searchable) searchRef.current?.focus();
  }, [open, searchable]);

  useEffect(() => {
    if (open) {
      optionRefs.current[highlighted]?.scrollIntoView({ block: "nearest" });
    }
  }, [open, highlighted]);

  function moveHighlight(index: number) {
    setHighlighted(Math.min(Math.max(index, 0), visible.length - 1));
  }

  function onTypeahead(key: string) {
    const now = Date.now();
    const buffer =
      now - typeahead.current.at < 500 ? typeahead.current.text + key : key;
    typeahead.current = { text: buffer, at: now };
    const lower = buffer.toLowerCase();
    const start = buffer.length === 1 ? highlighted + 1 : highlighted;
    for (let step = 0; step < visible.length; step++) {
      const index = (start + step) % visible.length;
      if (visible[index].label.toLowerCase().startsWith(lower)) {
        if (open) moveHighlight(index);
        else commit(index);
        return;
      }
    }
  }

  function onListNavigation(event: React.KeyboardEvent) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveHighlight(highlighted + 1);
        return true;
      case "ArrowUp":
        event.preventDefault();
        moveHighlight(highlighted - 1);
        return true;
      case "Home":
        event.preventDefault();
        moveHighlight(0);
        return true;
      case "End":
        event.preventDefault();
        moveHighlight(visible.length - 1);
        return true;
      case "Enter":
        event.preventDefault();
        commit(highlighted);
        return true;
      case "Escape":
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        return true;
      case "Tab":
        setOpen(false);
        return true;
      default:
        return false;
    }
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (disabled) return;

    if (!open) {
      switch (event.key) {
        case "ArrowDown":
        case "ArrowUp":
        case "Enter":
        case " ":
          event.preventDefault();
          openList();
          return;
        case "Home":
          event.preventDefault();
          openList();
          setHighlighted(0);
          return;
        case "End":
          event.preventDefault();
          openList();
          setHighlighted(options.length - 1);
          return;
        default:
          if (!searchable && event.key.length === 1 && /\S/.test(event.key)) {
            onTypeahead(event.key);
          }
          return;
      }
    }

    if (onListNavigation(event)) return;
    if (event.key === " " && !searchable) {
      event.preventDefault();
      commit(highlighted);
      return;
    }
    if (!searchable && event.key.length === 1 && /\S/.test(event.key)) {
      onTypeahead(event.key);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        id={id}
        disabled={disabled}
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={
          open && !searchable ? `${listboxId}-${highlighted}` : undefined
        }
        aria-label={labelId ? undefined : ariaLabel}
        aria-labelledby={labelId}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={cn(
          "flex items-center transition-colors disabled:cursor-not-allowed disabled:opacity-60",
          triggerVariants[variant],
          iconOnly
            ? "size-8 justify-center rounded-md"
            : cn("justify-between", triggerSizes[size]),
          className,
        )}
      >
        {iconOnly ?? (
          <>
            <span className="flex min-w-0 items-center gap-1.5">
              {selected?.icon}
              <span className="truncate">{selected?.label ?? ""}</span>
            </span>
            <svg
              aria-hidden
              viewBox="0 0 12 12"
              className={cn(
                "size-3 shrink-0 text-muted transition-transform",
                open && "rotate-180",
              )}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2.5 4.5 6 8l3.5-3.5" />
            </svg>
          </>
        )}
      </button>

      {open ? (
        <div
          className={cn(
            "absolute z-30 w-max min-w-full overflow-hidden rounded-lg border border-line bg-surface-2 shadow-xl",
            searchable && "min-w-60",
            placement === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {searchable ? (
            <div className="relative border-b border-line transition-colors focus-within:border-neutral-600">
              <svg
                aria-hidden
                viewBox="0 0 14 14"
                className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <circle cx="6" cy="6" r="4.2" />
                <path d="m9.2 9.2 3 3" />
              </svg>
              <input
                ref={searchRef}
                type="search"
                aria-label={searchPlaceholder}
                aria-controls={listboxId}
                aria-activedescendant={
                  visible.length ? `${listboxId}-${highlighted}` : undefined
                }
                placeholder={searchPlaceholder}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setHighlighted(0);
                }}
                onKeyDown={(event) => {
                  onListNavigation(event);
                }}
                className="no-focus-ring w-full bg-transparent py-2.5 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted"
              />
            </div>
          ) : null}

          <ul
            role="listbox"
            id={listboxId}
            aria-labelledby={labelId}
            aria-label={labelId ? undefined : ariaLabel}
            className="scroll-slim max-h-60 overflow-y-auto overscroll-contain p-1"
          >
            {visible.length === 0 ? (
              <li className="px-3 py-2.5 text-sm text-muted" aria-live="polite">
                No matches
              </li>
            ) : null}
            {visible.map((option, index) => (
              <li
                key={option.value}
                id={`${listboxId}-${index}`}
                role="option"
                aria-selected={option.value === value}
                ref={(el) => {
                  optionRefs.current[index] = el;
                }}
                onMouseEnter={() => setHighlighted(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => commit(index)}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 rounded-md",
                  optionSizes[size],
                  index === highlighted
                    ? "bg-white/5 text-foreground"
                    : "text-neutral-300",
                )}
              >
                <span className={cn("flex min-w-0 items-center", option.description ? "gap-2.5" : "gap-1.5")}>
                  {option.icon}
                  {option.description ? (
                    <span className="flex min-w-0 flex-col py-0.5">
                      <span className="truncate">{option.label}</span>
                      <span className="truncate text-xs text-muted">
                        {option.description}
                      </span>
                    </span>
                  ) : (
                    <span className="truncate">{option.label}</span>
                  )}
                </span>
                {option.value === value ? (
                  <svg
                    aria-hidden
                    viewBox="0 0 12 12"
                    className="size-3 shrink-0 text-brand"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m2.5 6.5 2.5 2.5 4.5-5.5" />
                  </svg>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function SelectField({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const id = useId();

  return (
    <div className="flex items-center gap-2">
      <label id={`${id}-label`} htmlFor={id} className="text-sm text-muted">
        {label}
      </label>
      <Select
        id={id}
        labelId={`${id}-label`}
        options={options}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}
