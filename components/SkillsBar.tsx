"use client";

import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import type { SkillDTO } from "@/lib/types";

type Severity = "Critical" | "High" | "Moderate" | "Met";

function severity(demand: number, level: number): Severity {
  const gap = demand - level;
  if (gap >= 4) return "Critical";
  if (gap >= 2) return "High";
  if (gap >= 0.5) return "Moderate";
  return "Met";
}

const SEVERITY_DOT: Record<Severity, string> = {
  Critical: "bg-red-400",
  High: "bg-amber-400",
  Moderate: "bg-ink-tertiary",
  Met: "bg-emerald-400",
};

/**
 * Compact single-bar row.
 *   ▓▓▓▓▓▓▓▓░░░░░░░░  <- demand track (faded lavender, full target width)
 *   ████░░            <- your level (solid green, layered over)
 * Designed so 3 of these stack inside one quadrant card and the whole page fits
 * on one screen without scrolling.
 */
export function SkillsBar({
  skill,
  index,
  recentlyUpdated,
  onLog,
}: {
  skill: SkillDTO;
  index: number;
  recentlyUpdated: boolean;
  onLog: (skill: SkillDTO) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 60);
    return () => window.clearTimeout(id);
  }, []);

  const sev = severity(skill.marketDemand, skill.currentLevel);
  const demandPct = skill.marketDemand * 10;
  const levelPct = skill.currentLevel * 10;
  const levelDisplay = useTweenedNumber(skill.currentLevel, 900);

  return (
    <div
      className={`group relative rounded-md px-2 py-1.5 transition-colors hover:bg-surface-2/60 ${
        recentlyUpdated ? "skill-glow" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`h-1.5 w-1.5 flex-none rounded-full ${SEVERITY_DOT[sev]}`} />
          <p className="truncate text-[12.5px] font-medium text-ink">{skill.name}</p>
        </div>
        <div className="flex flex-none items-center gap-2">
          <span className="tabular text-[11px] text-ink-tertiary">
            <span className="text-emerald-400 font-medium">{levelDisplay.toFixed(1)}</span>
            <span className="mx-0.5">/</span>
            <span>{skill.marketDemand}</span>
          </span>
          <button
            onClick={() => onLog(skill)}
            className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center h-5 w-5 rounded-md text-ink-subtle hover:text-ink hover:bg-surface-3"
            aria-label={`Log practice for ${skill.name}`}
            title="Log practice"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Single track — demand is the faded layer, you is the solid green overlay */}
      <div className="relative h-1.5 w-full rounded-full bg-surface-3/60 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary/40"
          style={{
            width: mounted ? `${demandPct}%` : "0%",
            transition: `width var(--bar-duration) var(--ease-out-soft)`,
            transitionDelay: `${index * 50}ms`,
          }}
        />
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-emerald-400/85"
          style={{
            width: mounted ? `${levelPct}%` : "0%",
            transition: `width var(--bar-duration) var(--ease-out-soft)`,
            transitionDelay: `${index * 50 + 90}ms`,
          }}
        />
      </div>
    </div>
  );
}

function useTweenedNumber(target: number, duration: number): number {
  const [shown, setShown] = useState(target);
  const fromRef = useRef(target);
  const targetRef = useRef(target);

  useEffect(() => {
    fromRef.current = shown;
    targetRef.current = target;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(fromRef.current + (targetRef.current - fromRef.current) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return shown;
}
