"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ChevronDown, CheckSquare, X } from "lucide-react";
import { JobCard, type DismissReason } from "./JobCard";
import { STATUS_LABEL, type JobDTO, type Status } from "@/lib/types";
import { cn } from "@/lib/cn";

export type SortKey = "opportunity" | "fit" | "recent" | "manual";

const SORT_LABEL: Record<SortKey, string> = {
  opportunity: "Best opportunity",
  fit: "Highest fit",
  recent: "Recently updated",
  manual: "Manual order",
};

export function Column({
  status,
  jobs,
  sort,
  onSortChange,
  onOpen,
  onDismiss,
  onMove,
  onApply,
  onBulkDelete,
}: {
  status: Status;
  jobs: JobDTO[];
  sort: SortKey;
  onSortChange: (k: SortKey) => void;
  onOpen?: (job: JobDTO) => void;
  onDismiss?: (job: JobDTO, reason: DismissReason) => void;
  onMove?: (job: JobDTO, status: Status) => void;
  onApply?: (job: JobDTO) => void;
  onBulkDelete?: (ids: string[]) => Promise<void>;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { type: "column", status },
  });

  const isInbox = status === "INBOX";

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
    setSelectMode(false);
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} role${selected.size === 1 ? "" : "s"} from ${STATUS_LABEL[status]}? This cannot be undone.`)) return;
    await onBulkDelete?.(Array.from(selected));
    clearSelection();
  }

  async function deleteAll() {
    if (jobs.length === 0) return;
    if (!confirm(`Delete ALL ${jobs.length} role${jobs.length === 1 ? "" : "s"} from ${STATUS_LABEL[status]}? This cannot be undone.`)) return;
    await onBulkDelete?.(jobs.map((j) => j.id));
    clearSelection();
  }

  return (
    <div className="flex min-w-0 flex-col rounded-lg border border-hairline bg-surface-1/50 edge-highlight">
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <h2
            className={cn(
              "text-eyebrow uppercase whitespace-nowrap",
              isInbox ? "text-ink" : "text-ink-subtle"
            )}
            style={{ fontSize: "11px" }}
          >
            {STATUS_LABEL[status]}
          </h2>
          <span className="text-caption text-ink-tertiary flex-none">{jobs.length}</span>
        </div>
        <div className="flex items-center gap-1 flex-none">
          {!selectMode && jobs.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectMode(true)}
              className="flex items-center gap-1 rounded-sm px-1 text-[11px] text-ink-tertiary hover:text-ink-subtle"
              title="Select roles to delete"
            >
              <CheckSquare className="h-3 w-3" />
              Select
            </button>
          )}
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => onSortChange(e.target.value as SortKey)}
              className="appearance-none rounded-sm bg-transparent pl-1 pr-4 text-[11px] text-ink-tertiary hover:text-ink-subtle focus:outline-none cursor-pointer"
              title="Sort"
            >
              {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                <option key={k} value={k} className="bg-surface-2 text-ink">
                  {SORT_LABEL[k]}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 h-3 w-3 text-ink-tertiary" />
          </div>
        </div>
      </div>

      {selectMode && (
        <div className="mx-2 mb-2 flex items-center justify-between gap-2 rounded-md border border-hairline bg-surface-2 px-2 py-1.5">
          <span className="text-caption text-ink-muted">
            {selected.size} selected
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={deleteSelected}
              disabled={selected.size === 0}
              className="rounded px-2 py-0.5 text-[11px] text-[#f5a623] hover:bg-surface-3 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Delete {selected.size || ""}
            </button>
            <button
              type="button"
              onClick={deleteAll}
              className="rounded px-2 py-0.5 text-[11px] text-[#f5a623] hover:bg-surface-3"
            >
              Delete all
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="rounded p-1 text-ink-tertiary hover:text-ink-subtle"
              title="Cancel selection"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-1 flex-col gap-2 p-2 transition-colors min-h-32",
          isOver && "bg-surface-2/50"
        )}
      >
        <SortableContext items={jobs.map((j) => j.id)} strategy={verticalListSortingStrategy}>
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onOpen={onOpen}
              onDismiss={!selectMode ? onDismiss : undefined}
              onMove={!selectMode ? onMove : undefined}
              onApply={!selectMode ? onApply : undefined}
              selectMode={selectMode}
              selected={selected.has(job.id)}
              onToggleSelect={() => toggle(job.id)}
            />
          ))}
        </SortableContext>
        {jobs.length === 0 && (
          <div className="flex flex-1 items-center justify-center py-8 text-caption text-ink-tertiary">
            {isInbox ? "Empty — hit Refresh" : "Drop a card here"}
          </div>
        )}
      </div>
    </div>
  );
}
