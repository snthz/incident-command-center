"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/** Writes to the clipboard, falling back to a hidden textarea when the
 *  async API is unavailable (non-HTTPS origins block it). */
async function writeToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(textarea);
  if (!ok) throw new Error("copy command rejected");
}

export function CopyButton({
  value,
  label,
  className,
}: {
  value: string;
  /** Describes what gets copied, e.g. "email". */
  label: string;
  className?: string;
}) {
  // Tracking the copied text (not a boolean) keeps the confirmation tied to
  // what was actually copied, so switching values clears it.
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const copied = copiedValue === value;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function copy() {
    try {
      await writeToClipboard(value);
    } catch {
      return;
    }
    setCopiedValue(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopiedValue(null), 1500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? `Copied ${label}` : `Copy ${label}`}
      title={copied ? "Copied" : `Copy ${label}`}
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-md border border-line text-muted transition-colors hover:bg-white/5 hover:text-foreground",
        copied && "border-brand/40 text-brand hover:text-brand",
        className,
      )}
    >
      {copied ? (
        <svg
          aria-hidden
          viewBox="0 0 14 14"
          className="size-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m3 7.5 3 3 5-6.5" />
        </svg>
      ) : (
        <svg
          aria-hidden
          viewBox="0 0 14 14"
          className="size-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="5" y="5" width="7.5" height="7.5" rx="1.5" />
          <path d="M9.5 2.5a1.5 1.5 0 0 0-1.5-1H3a1.5 1.5 0 0 0-1.5 1.5V8a1.5 1.5 0 0 0 1 1.5" />
        </svg>
      )}
      <span aria-live="polite" className="sr-only">
        {copied ? `${label} copied` : ""}
      </span>
    </button>
  );
}
