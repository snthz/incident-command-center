"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export function MobileSidebar({ children }: { children: React.ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Close the drawer when navigation lands — render-phase adjustment,
  // see react.dev "storing information from previous renders".
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        aria-label="Open navigation"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-white/5 hover:text-neutral-200 lg:hidden"
      >
        <svg aria-hidden viewBox="0 0 16 16" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" />
        </svg>
      </button>

      <dialog
        ref={dialogRef}
        aria-label="Navigation"
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === dialogRef.current) setOpen(false);
        }}
        className="drawer fixed inset-y-0 left-0 right-auto m-0 h-dvh max-h-none w-72 border-r border-line bg-surface p-0 text-foreground shadow-2xl shadow-black/60 backdrop:bg-black/60"
      >
        <div className="flex h-full flex-col">{children}</div>
      </dialog>
    </>
  );
}
