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
  className?: string;
  id?: string;
  labelId?: string;
  "aria-label"?: string;
};

export function Select({
  options,
  value,
  onChange,
  disabled,
  size = "md",
  variant = "outline",
  align = "start",
  className,
  id,
  labelId,
  "aria-label": ariaLabel,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLLIElement | null>>([]);
  const typeahead = useRef({ text: "", at: 0 });
  const listboxId = useId();

  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const selected = options[selectedIndex];

  function openList() {
    setHighlighted(selectedIndex);
    setOpen(true);
  }

  function commit(index: number) {
    setOpen(false);
    const option = options[index];
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
    if (open) {
      optionRefs.current[highlighted]?.scrollIntoView({ block: "nearest" });
    }
  }, [open, highlighted]);

  function moveHighlight(index: number) {
    setHighlighted(Math.min(Math.max(index, 0), options.length - 1));
  }

  function onTypeahead(key: string) {
    const now = Date.now();
    const buffer =
      now - typeahead.current.at < 500 ? typeahead.current.text + key : key;
    typeahead.current = { text: buffer, at: now };
    const lower = buffer.toLowerCase();
    const start = buffer.length === 1 ? highlighted + 1 : highlighted;
    for (let step = 0; step < options.length; step++) {
      const index = (start + step) % options.length;
      if (options[index].label.toLowerCase().startsWith(lower)) {
        if (open) moveHighlight(index);
        else commit(index);
        return;
      }
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
          if (event.key.length === 1 && /\S/.test(event.key)) {
            onTypeahead(event.key);
          }
          return;
      }
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveHighlight(highlighted + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveHighlight(highlighted - 1);
        break;
      case "Home":
        event.preventDefault();
        moveHighlight(0);
        break;
      case "End":
        event.preventDefault();
        moveHighlight(options.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        commit(highlighted);
        break;
      case "Escape":
        event.preventDefault();
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        if (event.key.length === 1 && /\S/.test(event.key)) {
          onTypeahead(event.key);
        }
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        role="combobox"
        id={id}
        disabled={disabled}
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open ? `${listboxId}-${highlighted}` : undefined}
        aria-label={labelId ? undefined : ariaLabel}
        aria-labelledby={labelId}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={cn(
          "flex items-center justify-between transition-colors disabled:cursor-not-allowed disabled:opacity-60",
          triggerVariants[variant],
          triggerSizes[size],
          className,
        )}
      >
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
      </button>

      {open ? (
        <ul
          role="listbox"
          id={listboxId}
          aria-labelledby={labelId}
          aria-label={labelId ? undefined : ariaLabel}
          className={cn(
            "absolute z-30 mt-1 max-h-60 w-max min-w-full overflow-auto rounded-md border border-line bg-surface-2 py-1 shadow-xl",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {options.map((option, index) => (
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
                "flex cursor-pointer items-center justify-between gap-3",
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
