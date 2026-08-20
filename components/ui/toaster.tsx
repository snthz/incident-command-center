"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/cn";

type ToastType = "loading" | "success" | "error";
type Toast = { id: number; type: ToastType; message: string };

type ToastApi = {
  push: (type: ToastType, message: string) => number;
  update: (id: number, type: ToastType, message: string) => void;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast() {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast requires ToastProvider");
  return api;
}

const AUTO_DISMISS_MS: Record<ToastType, number | null> = {
  loading: null,
  success: 2500,
  error: 6000,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const schedule = useCallback(
    (id: number, type: ToastType) => {
      const existing = timers.current.get(id);
      if (existing) clearTimeout(existing);
      const delay = AUTO_DISMISS_MS[type];
      if (delay !== null) {
        timers.current.set(id, setTimeout(() => dismiss(id), delay));
      }
    },
    [dismiss],
  );

  const push = useCallback(
    (type: ToastType, message: string) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, type, message }]);
      schedule(id, type);
      return id;
    },
    [schedule],
  );

  const update = useCallback(
    (id: number, type: ToastType, message: string) => {
      setToasts((current) =>
        current.map((toast) =>
          toast.id === id ? { ...toast, type, message } : toast,
        ),
      );
      schedule(id, type);
    },
    [schedule],
  );

  const api = useMemo(
    () => ({ push, update, dismiss }),
    [push, update, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-label="Notifications"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
      >
        {toasts.map((toast) => (
          <ToastCard
            key={toast.id}
            toast={toast}
            onDismiss={() => dismiss(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastIcon({ type }: { type: ToastType }) {
  if (type === "loading") {
    return (
      <span
        aria-hidden
        className="size-4 shrink-0 animate-spin rounded-full border-2 border-line border-t-brand"
      />
    );
  }
  if (type === "success") {
    return (
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        className="size-4 shrink-0 text-emerald-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="8" cy="8" r="6.5" />
        <path d="m5.2 8.2 2 2 3.6-4.4" />
      </svg>
    );
  }
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="size-4 shrink-0 text-red-400"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <circle cx="8" cy="8" r="6.5" />
      <path d="m5.8 5.8 4.4 4.4m0-4.4-4.4 4.4" />
    </svg>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  return (
    <div
      role={toast.type === "error" ? "alert" : "status"}
      className={cn(
        "toast-enter pointer-events-auto flex items-center gap-2.5 rounded-lg border bg-surface-2 px-3 py-2.5 text-sm shadow-lg",
        toast.type === "error" ? "border-red-500/40" : "border-line",
      )}
    >
      <ToastIcon type={toast.type} />
      <p className="flex-1 text-foreground">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="rounded p-0.5 text-muted hover:text-foreground"
      >
        <svg
          aria-hidden
          viewBox="0 0 12 12"
          className="size-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        >
          <path d="m3 3 6 6m0-6-6 6" />
        </svg>
      </button>
    </div>
  );
}
