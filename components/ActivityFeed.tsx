"use client";

import { useState } from "react";
import { ChevronDown, Undo2 } from "lucide-react";
import type { SkillLogDTO } from "@/lib/types";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/**
 * Collapsible recent-practice list — single-line header by default; expands in
 * place with a smooth max-height transition.
 */
export function ActivityFeed({
  logs,
  onUndo,
}: {
  logs: SkillLogDTO[];
  onUndo: (logId: string) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="glossy rounded-lg border border-hairline overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-surface-2/40"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-body-sm font-medium text-ink">Recent practice</h2>
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] tabular text-ink-subtle">
            {logs.length}
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 flex-none text-ink-subtle transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-400"
        style={{
          gridTemplateRows: open ? "1fr" : "0fr",
          transitionTimingFunction: "var(--ease-out-soft)",
        }}
      >
        <div className="overflow-hidden">
          <div className="border-t border-hairline px-5 pt-2 pb-3">
            {logs.length === 0 ? (
              <p className="py-2 text-caption text-ink-subtle">
                Log your first hour of practice — it will show up here with an undo button.
              </p>
            ) : (
              <ul className="divide-y divide-hairline/70">
                {logs.map((l, i) => {
                  const when = new Date(l.createdAt);
                  const undoable = Date.now() - when.getTime() < TWENTY_FOUR_HOURS_MS;
                  return (
                    <li
                      key={l.id}
                      className="row-enter flex items-center gap-3 py-2"
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-caption text-ink truncate">{l.skillName}</span>
                          <span className="text-[11px] text-ink-tertiary">·</span>
                          <span className="text-[11px] tabular text-ink-subtle">
                            +{formatHours(l.hours)}
                          </span>
                          <span className="text-[11px] text-ink-tertiary">·</span>
                          <span className="text-[11px] tabular text-emerald-400">
                            +{l.levelGain.toFixed(2)} lvl
                          </span>
                        </div>
                        {l.note ? (
                          <p className="mt-0.5 text-[11px] text-ink-tertiary truncate">{l.note}</p>
                        ) : null}
                      </div>
                      <span className="flex-none text-[11px] tabular text-ink-tertiary">
                        {relativeTime(when)}
                      </span>
                      {undoable ? (
                        <button
                          onClick={() => onUndo(l.id)}
                          className="flex-none inline-flex items-center gap-1 rounded-md border border-hairline px-1.5 py-0.5 text-[11px] text-ink-subtle transition-colors hover:bg-surface-2 hover:text-ink"
                          title="Undo this log"
                        >
                          <Undo2 className="h-3 w-3" />
                          Undo
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function formatHours(h: number): string {
  const whole = Math.floor(h);
  const mins = Math.round((h - whole) * 60);
  if (whole === 0) return `${mins}m`;
  if (mins === 0) return `${whole}h`;
  return `${whole}h ${mins}m`;
}

function relativeTime(d: Date): string {
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
