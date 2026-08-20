"use client";

import { useEffect, useState } from "react";
import { formatAbsoluteUTC, formatRelative } from "@/lib/dates";

export function TimeAgo({ date, className }: { date: Date; className?: string }) {
  const absolute = formatAbsoluteUTC(date);
  const [label, setLabel] = useState<string | null>(null);
  const timestamp = date.getTime();

  useEffect(() => {
    const update = () => setLabel(formatRelative(new Date(timestamp)));
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [timestamp]);

  return (
    <time dateTime={date.toISOString()} title={absolute} className={className}>
      {label ?? absolute}
    </time>
  );
}
