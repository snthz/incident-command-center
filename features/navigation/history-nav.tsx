"use client";

import { useRouter } from "next/navigation";

export function HistoryNav() {
  const router = useRouter();

  return (
    <div className="flex items-center">
      <button
        type="button"
        aria-label="Go back"
        onClick={() => router.back()}
        className="flex size-6 items-center justify-center rounded text-muted transition-colors hover:bg-white/5 hover:text-neutral-200"
      >
        <svg aria-hidden viewBox="0 0 12 12" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7.5 2.5 4 6l3.5 3.5" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Go forward"
        onClick={() => router.forward()}
        className="flex size-6 items-center justify-center rounded text-muted transition-colors hover:bg-white/5 hover:text-neutral-200"
      >
        <svg aria-hidden viewBox="0 0 12 12" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4.5 2.5 8 6l-3.5 3.5" />
        </svg>
      </button>
    </div>
  );
}
