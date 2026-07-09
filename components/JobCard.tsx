"use client";

import { useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ExternalLink, MapPin, Bell, X, Check, Sparkles, ArrowRight, Send } from "lucide-react";
import { cn } from "@/lib/cn";
import { STATUSES, STATUS_LABEL, type JobDTO, type Status } from "@/lib/types";

export type DismissReason =
  | "WRONG_FUNCTION"
  | "WRONG_STAGE"
  | "BAD_COMPANY"
  | "NOT_INTERESTED"
  | "UNSPECIFIED";

const REASON_CHIPS: { value: DismissReason; label: string }[] = [
  { value: "WRONG_FUNCTION", label: "Wrong function" },
  { value: "WRONG_STAGE", label: "Too senior" },
  { value: "BAD_COMPANY", label: "Bad company" },
  { value: "NOT_INTERESTED", label: "Not interested" },
];

function isDueTodayOrPast(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return d.getTime() <= today.getTime() + 24 * 60 * 60 * 1000 - 1;
}

function OpportunityChip({ score }: { score: number }) {
  return (
    <span
      title="Opportunity score — blend of fit, company prestige, learning potential, reputation"
      className="inline-flex items-center gap-0.5 rounded-pill border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary cursor-help"
    >
      <Sparkles className="h-2.5 w-2.5" />
      {score}
    </span>
  );
}

function FitBadge({ score, reason }: { score: number; reason: string | null }) {
  const color =
    score >= 75
      ? "text-[#27a644] bg-[#27a644]/10 border-[#27a644]/20"
      : score >= 50
      ? "text-ink-muted bg-surface-2 border-hairline"
      : "text-ink-tertiary bg-surface-2 border-hairline";

  return (
    <span
      title={reason ?? undefined}
      className={cn(
        "inline-flex items-center rounded-pill border px-2 py-0.5 text-[11px] font-medium cursor-help",
        color
      )}
    >
      {score}% fit
    </span>
  );
}

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Visual-only card — used both inside the column and in the drag overlay. */
export function JobCardVisual({
  job,
  overlay,
  onOpen,
  onDismiss,
  onMove,
  onApply,
  dragProps,
  selectMode,
  selected,
  onToggleSelect,
}: {
  job: JobDTO;
  overlay?: boolean;
  onOpen?: (job: JobDTO) => void;
  onDismiss?: (job: JobDTO, reason: DismissReason) => void;
  onMove?: (job: JobDTO, status: Status) => void;
  onApply?: (job: JobDTO) => void;
  dragProps?: React.HTMLAttributes<HTMLDivElement>;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const host = hostOf(job.url);
  const [hoverOpen, setHoverOpen] = useState(false);
  const [reasonOpen, setReasonOpen] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onMouseEnter() {
    if (overlay || selectMode || reasonOpen) return;
    hoverTimer.current = setTimeout(() => setHoverOpen(true), 350);
  }
  function onMouseLeave() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setHoverOpen(false);
  }

  const fallbackSummary =
    job.summary || (job.description ? job.description.slice(0, 200) + "…" : null);

  return (
    <div
      {...(selectMode ? {} : dragProps)}
      onClick={(e) => {
        if (selectMode) {
          onToggleSelect?.();
        } else {
          onOpen?.(job);
        }
        e.stopPropagation();
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "group relative cursor-pointer rounded-lg border bg-surface-1 p-3.5 text-left lift-on-hover edge-highlight",
        selected
          ? "border-primary bg-surface-2"
          : "border-hairline hover:border-hairline-strong hover:bg-surface-2",
        overlay && "cursor-grabbing border-hairline-strong bg-surface-2 shadow-2xl shadow-black/40"
      )}
    >
      {selectMode && (
        <div className="mb-2 flex items-center gap-2">
          <span
            className={cn(
              "flex h-4 w-4 items-center justify-center rounded border",
              selected
                ? "border-primary bg-primary text-white"
                : "border-hairline-strong bg-surface-1"
            )}
          >
            {selected && <Check className="h-3 w-3" />}
          </span>
          <span className="text-caption text-ink-tertiary">
            {selected ? "Selected" : "Click to select"}
          </span>
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-body-sm font-medium leading-snug text-ink line-clamp-2">
          {job.title}
        </h3>
        {isDueTodayOrPast(job.followUpAt) && (
          <span
            title={`Follow up due ${new Date(job.followUpAt!).toLocaleDateString()}`}
            className="flex-none text-[#f5a623]"
          >
            <Bell className="h-3.5 w-3.5" />
          </span>
        )}
        {job.url && (
          <a
            href={job.url}
            target="_blank"
            rel="noreferrer noopener"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex-none rounded p-1 text-ink-tertiary opacity-0 transition-opacity hover:text-ink-subtle group-hover:opacity-100"
            aria-label="Open job posting"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        {onApply && job.status === "WISHLIST" && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onApply(job);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex-none rounded p-1 text-ink-tertiary opacity-0 transition-opacity hover:text-success group-hover:opacity-100"
            aria-label="Mark as applied"
            title="Mark as applied"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (hoverTimer.current) clearTimeout(hoverTimer.current);
              setHoverOpen(false);
              setReasonOpen(true);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex-none rounded p-1 text-ink-tertiary opacity-0 transition-opacity hover:text-[#f5a623] group-hover:opacity-100"
            aria-label="Dismiss — not interested"
            title="Not interested"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="mt-1 text-caption text-ink-subtle">{job.company}</div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {job.location && (
          <span className="inline-flex items-center gap-1 rounded-pill bg-surface-2 px-2 py-0.5 text-caption text-ink-muted">
            <MapPin className="h-3 w-3" />
            {job.location}
          </span>
        )}
        {host && (
          <span className="font-mono inline-flex items-center rounded-pill bg-surface-2 px-2 py-0.5 text-[11px] text-ink-subtle">
            {host}
          </span>
        )}
        {job.fitScore != null && (
          <FitBadge score={job.fitScore} reason={job.fitReason} />
        )}
        {job.opportunityScore != null && (
          <OpportunityChip score={job.opportunityScore} />
        )}
        {onMove && !overlay && !selectMode && (
          <div className="relative ml-auto opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
            <ArrowRight className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-ink-tertiary" />
            <select
              value={job.status}
              onChange={(e) => onMove(job, e.target.value as Status)}
              className="h-6 appearance-none rounded-pill border border-hairline bg-surface-2 pl-5 pr-2 text-[11px] text-ink-tertiary hover:text-ink hover:border-hairline-strong focus:outline-none cursor-pointer"
              title="Move to column"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s} className="bg-surface-1 text-ink">
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {reasonOpen && onDismiss && !overlay && !selectMode && (
        <div
          className="absolute left-0 right-0 top-full z-40 mt-1 rounded-md border border-hairline-strong bg-surface-2 p-3 shadow-2xl shadow-black/40"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="text-eyebrow uppercase text-ink-tertiary mb-2">Why dismiss?</div>
          <div className="flex flex-wrap gap-1.5">
            {REASON_CHIPS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => {
                  setReasonOpen(false);
                  onDismiss(job, r.value);
                }}
                className="rounded-pill border border-hairline bg-surface-1 px-2 py-0.5 text-[11px] text-ink-subtle hover:text-ink hover:border-hairline-strong"
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setReasonOpen(false);
                onDismiss(job, "UNSPECIFIED");
              }}
              className="text-[11px] text-ink-tertiary hover:text-ink-subtle"
            >
              Skip — just delete
            </button>
            <button
              type="button"
              onClick={() => setReasonOpen(false)}
              className="text-[11px] text-ink-tertiary hover:text-ink-subtle"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {hoverOpen && !reasonOpen && !overlay && !selectMode && (
        <div
          className="absolute left-0 right-0 top-full z-30 mt-1 rounded-md border border-hairline-strong bg-surface-2 p-3 shadow-2xl shadow-black/40 pointer-events-none"
        >
          {fallbackSummary && (
            <>
              <div className="text-eyebrow uppercase text-ink-tertiary mb-1">Summary</div>
              <p className="text-caption text-ink-muted leading-snug">{fallbackSummary}</p>
            </>
          )}
          {job.experienceReq && (
            <>
              <div className="text-eyebrow uppercase text-ink-tertiary mb-1 mt-2">
                Experience needed
              </div>
              <p className="text-caption text-ink-muted">{job.experienceReq}</p>
            </>
          )}
          {job.fitReason && (
            <>
              <div className="text-eyebrow uppercase text-ink-tertiary mb-1 mt-2">
                Why it matched you
              </div>
              <p className="text-caption text-ink-muted leading-snug">{job.fitReason}</p>
            </>
          )}
          {job.companyPrestige != null && job.companyReputation != null && (
            <div className="mt-2 flex items-center gap-3 text-[11px] text-ink-tertiary">
              <span>Prestige {job.companyPrestige}/10</span>
              <span>Reputation {job.companyReputation}/10</span>
              {job.learningPotential != null && (
                <span>Learning {job.learningPotential}/10</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function JobCard({
  job,
  onOpen,
  onDismiss,
  onMove,
  onApply,
  selectMode,
  selected,
  onToggleSelect,
}: {
  job: JobDTO;
  onOpen?: (job: JobDTO) => void;
  onDismiss?: (job: JobDTO, reason: DismissReason) => void;
  onMove?: (job: JobDTO, status: Status) => void;
  onApply?: (job: JobDTO) => void;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: job.id,
    data: { type: "job", job },
    disabled: selectMode,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <JobCardVisual
        job={job}
        onOpen={onOpen}
        onDismiss={onDismiss}
        onMove={onMove}
        onApply={onApply}
        dragProps={{ ...attributes, ...listeners }}
        selectMode={selectMode}
        selected={selected}
        onToggleSelect={onToggleSelect}
      />
    </div>
  );
}
