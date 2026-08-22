"use client";

import { useReportWebVitals } from "next/web-vitals";

type WebVitalsMetric = Parameters<Parameters<typeof useReportWebVitals>[0]>[0];

function formatValue(metric: WebVitalsMetric) {
  if (metric.name === "CLS") return metric.value.toFixed(3);
  return `${Math.round(metric.value)}ms`;
}

const reported = new Set<string>();

function report(metric: WebVitalsMetric) {
  const key = `${metric.name}:${metric.value}`;
  if (reported.has(key)) return;
  reported.add(key);
  console.debug(
    `[web-vitals] ${metric.name} ${formatValue(metric)} (${metric.rating})`,
    { id: metric.id, navigationType: metric.navigationType },
  );
}

export function WebVitalsReporter() {
  useReportWebVitals(report);
  return null;
}
