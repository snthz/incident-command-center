"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createRealtimeClient } from "@/lib/supabase/client";

export function DashboardRealtime() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 400);
    };

    (async () => {
      const supabase = await createRealtimeClient();
      if (cancelled) return;
      const channel = supabase
        .channel("dashboard-incidents")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "incidents" },
          scheduleRefresh,
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "incident_updates" },
          scheduleRefresh,
        )
        .subscribe();

      cleanup = () => {
        supabase.removeChannel(channel);
      };
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      cleanup?.();
    };
  }, [router]);

  return null;
}
