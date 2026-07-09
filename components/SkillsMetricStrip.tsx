"use client";

import { useEffect, useRef, useState } from "react";
import type { SkillsSummary } from "@/lib/types";

/**
 * Four-card metric strip at the top of /skills.
 * Numbers tween from 0 → target on mount via requestAnimationFrame so the page
 * feels alive on cold load (no library, ~20 lines of math).
 */
export function SkillsMetricStrip({ summary }: { summary: SkillsSummary }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <MetricCard label="Critical gaps" value={summary.criticalGaps} tone="danger" suffix="" />
      <MetricCard label="Strengths" value={summary.strengths} tone="success" suffix="" />
      <MetricCard label="Market readiness" value={summary.marketReadiness} suffix="/100" tone="default" />
      <MetricCard label="Goal" value={summary.goal} suffix="/100" tone="primary" />
    </div>
  );
}

function MetricCard({
  label,
  value,
  suffix,
  tone,
}: {
  label: string;
  value: number;
  suffix: string;
  tone: "default" | "danger" | "success" | "primary";
}) {
  const [shown, setShown] = useState(0);
  const targetRef = useRef(value);
  targetRef.current = value;

  useEffect(() => {
    const start = performance.now();
    const from = shown;
    const to = targetRef.current;
    const duration = 900;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const color =
    tone === "danger"
      ? "text-red-400"
      : tone === "success"
      ? "text-success"
      : tone === "primary"
      ? "text-primary"
      : "text-ink";

  return (
    <div className="glossy lift-on-hover rounded-md border border-hairline px-4 py-3">
      <p className="text-[11px] uppercase tracking-wider text-ink-subtle">{label}</p>
      <p className={`mt-1 text-2xl font-medium tabular ${color}`}>
        {shown}
        <span className="ml-0.5 text-sm font-normal text-ink-tertiary">{suffix}</span>
      </p>
    </div>
  );
}
