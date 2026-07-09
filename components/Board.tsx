"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Plus, RefreshCw, Loader2, Search } from "lucide-react";
import { Column, type SortKey } from "./Column";
import { JobCardVisual } from "./JobCard";
import { Button } from "./ui/Button";
import { AddJobDialog } from "./AddJobDialog";
import { JobDetailDialog } from "./JobDetailDialog";
import { SuggestionsBar } from "./SuggestionsBar";
import { TopNav } from "./TopNav";
import { STATUSES, type JobDTO, type Status } from "@/lib/types";

type DiscoverReport = {
  fetched: number;
  inserted: number;
  skipped: number;
  filtered: number;
  errors: { source: string; query: string; message: string }[];
};

const DEFAULT_SORT: Record<Status, SortKey> = {
  INBOX: "opportunity",
  WISHLIST: "fit",
  APPLIED: "recent",
  INTERVIEWING: "recent",
  OFFER: "recent",
  REJECTED: "recent",
};

const HOUR_MS = 24 * 60 * 60 * 1000;
const MIN_GAP_MS = 23 * 60 * 60 * 1000; // skip auto-fire if a refresh happened <23h ago

export function Board() {
  const [jobs, setJobs] = useState<JobDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeJob, setActiveJob] = useState<JobDTO | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [detailJob, setDetailJob] = useState<JobDTO | null>(null);
  const [search, setSearch] = useState("");
  const [sorts, setSorts] = useState<Record<Status, SortKey>>(DEFAULT_SORT);
  const [discoverState, setDiscoverState] = useState<{
    running: boolean;
    lastRun: number | null;
    lastReport: DiscoverReport | null;
  }>({ running: false, lastRun: null, lastReport: null });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Multi-container collision: prefer pointer-within so empty columns register,
  // fall back to rect-intersection when pointer isn't inside any droppable.
  const collisionDetection: CollisionDetection = useCallback((args) => {
    const pointerHits = pointerWithin(args);
    if (pointerHits.length > 0) return pointerHits;
    return rectIntersection(args);
  }, []);

  useEffect(() => {
    void initialLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hourly auto-refresh with tab-visibility pause + min-gap gate.
  useEffect(() => {
    function tryAutoFire() {
      if (typeof document !== "undefined" && document.hidden) return;
      // Always try the digest tick — server-side shouldFireDigest() is authoritative.
      void fetch("/api/digest", { method: "POST", body: JSON.stringify({}) }).catch(() => null);
      // Always try suggestions poll — server skips silently if Gmail not configured.
      void fetch("/api/suggestions/poll", { method: "POST" }).catch(() => null);
      // v14 — weekly market-demand refresh. Server route reads current values;
      // gate here uses last-refreshed timestamp so we don't fire more than once a week.
      void (async () => {
        try {
          const r = await fetch("/api/skills/refresh-demand", { cache: "no-store" });
          const data = (await r.json()) as { lastRefreshedAt: string | null };
          const last = data.lastRefreshedAt ? Date.parse(data.lastRefreshedAt) : 0;
          if (Date.now() - last > 7 * 24 * 60 * 60 * 1000) {
            await fetch("/api/skills/refresh-demand", { method: "POST" });
          }
        } catch {
          /* silent — refresh is best-effort */
        }
      })();

      const last = discoverState.lastRun;
      if (last && Date.now() - last < MIN_GAP_MS) return;
      void runDiscover(true);
    }
    const id = setInterval(tryAutoFire, HOUR_MS);
    const onVis = () => {
      if (!document.hidden) tryAutoFire();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discoverState.lastRun]);

  // Keep "Last refresh Xm ago" indicator live without a full re-render storm
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  async function initialLoad() {
    await refresh();
    // fire-and-forget discovery on initial mount (per Sidharth's choice)
    void runDiscover(true);
  }

  async function refresh() {
    setLoading(true);
    const res = await fetch("/api/jobs", { cache: "no-store" });
    const data = (await res.json()) as { jobs: JobDTO[] };
    setJobs(data.jobs);
    setLoading(false);
  }

  async function runDiscover(silent = false) {
    if (discoverState.running) return;
    setDiscoverState((s) => ({ ...s, running: true }));
    try {
      const res = await fetch("/api/discover", { method: "POST" });
      const data = (await res.json()) as { ok: boolean; report?: DiscoverReport };
      if (data.ok && data.report) {
        setDiscoverState({
          running: false,
          lastRun: Date.now(),
          lastReport: data.report,
        });
        if (data.report.inserted > 0) await refresh();
      } else {
        setDiscoverState((s) => ({ ...s, running: false, lastRun: Date.now() }));
      }
    } catch {
      setDiscoverState((s) => ({ ...s, running: false, lastRun: Date.now() }));
    }
    void silent; // keep param for future use
  }

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        (j.location?.toLowerCase().includes(q) ?? false)
    );
  }, [jobs, search]);

  function jobsByStatus(status: Status): JobDTO[] {
    const list = filteredJobs.filter((j) => j.status === status);
    const sort = sorts[status];
    if (sort === "opportunity") {
      return [...list].sort(
        (a, b) => (b.opportunityScore ?? -1) - (a.opportunityScore ?? -1)
      );
    }
    if (sort === "fit") {
      return [...list].sort((a, b) => (b.fitScore ?? -1) - (a.fitScore ?? -1));
    }
    if (sort === "recent") {
      return [...list].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    }
    return [...list].sort((a, b) => a.position - b.position);
  }

  function findJob(id: string) {
    return jobs.find((j) => j.id === id) ?? null;
  }

  function onDragStart(e: DragStartEvent) {
    const j = findJob(String(e.active.id));
    if (j) setActiveJob(j);
  }

  function onDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const aJob = findJob(String(active.id));
    if (!aJob) return;
    const overData = over.data.current as { type?: string; status?: Status } | undefined;
    const overJob = findJob(String(over.id));

    let targetStatus: Status | null = null;
    if (overData?.type === "column" && overData.status) targetStatus = overData.status;
    else if (overJob) targetStatus = overJob.status;
    if (!targetStatus || targetStatus === aJob.status) return;

    setJobs((prev) => prev.map((j) => (j.id === aJob.id ? { ...j, status: targetStatus! } : j)));
  }

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveJob(null);
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    setJobs((prev) => {
      const activeJ = prev.find((j) => j.id === activeId);
      if (!activeJ) return prev;

      const overData = over.data.current as { type?: string; status?: Status } | undefined;
      const targetStatus: Status =
        overData?.type === "column" && overData.status
          ? overData.status
          : prev.find((j) => j.id === overId)?.status ?? activeJ.status;

      const sameCol = prev
        .filter((j) => j.status === targetStatus)
        .sort((a, b) => a.position - b.position);

      let nextSameCol = sameCol;
      const overIdx = sameCol.findIndex((j) => j.id === overId);
      const activeIdx = sameCol.findIndex((j) => j.id === activeId);

      if (activeIdx === -1) {
        const newEntry = { ...activeJ, status: targetStatus };
        if (overIdx === -1) nextSameCol = [...sameCol, newEntry];
        else nextSameCol = [...sameCol.slice(0, overIdx), newEntry, ...sameCol.slice(overIdx)];
      } else if (overIdx !== -1 && overIdx !== activeIdx) {
        nextSameCol = arrayMove(sameCol, activeIdx, overIdx);
      }

      const repositioned = nextSameCol.map((j, idx) => ({
        ...j,
        position: idx,
        status: targetStatus,
      }));
      const next = prev
        .filter((j) => j.status !== targetStatus && j.id !== activeId)
        .concat(repositioned);

      void persistOrder(repositioned);
      return next;
    });
  }

  async function dismissJob(job: JobDTO, reason: string = "UNSPECIFIED") {
    // Hard delete — dismissed roles vanish completely. Reason is logged to
    // Dismissal table for funnel analytics on /stats.
    setJobs((prev) => prev.filter((j) => j.id !== job.id));
    try {
      await fetch(`/api/jobs/${job.id}?reason=${encodeURIComponent(reason)}`, {
        method: "DELETE",
      });
    } catch {
      // best-effort; on failure the next refresh will restore truth
    }
  }

  async function applyJob(job: JobDTO) {
    const now = new Date();
    const followUp = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nowIso = now.toISOString();
    const followUpIso = followUp.toISOString();

    setJobs((prev) =>
      prev.map((j) =>
        j.id === job.id
          ? { ...j, status: "APPLIED" as Status, appliedAt: nowIso, followUpAt: followUpIso }
          : j
      )
    );
    await fetch(`/api/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "APPLIED",
        appliedAt: nowIso,
        followUpAt: followUpIso,
      }),
    });
  }

  async function moveJob(job: JobDTO, status: Status) {
    setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status } : j)));
    await fetch(`/api/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function deleteJobs(ids: string[]) {
    if (ids.length === 0) return;
    setJobs((prev) => prev.filter((j) => !ids.includes(j.id)));
    await Promise.all(
      ids.map((id) => fetch(`/api/jobs/${id}`, { method: "DELETE" }).catch(() => null))
    );
  }

  async function persistOrder(updated: JobDTO[]) {
    const updates = updated.map((j) => ({ id: j.id, status: j.status, position: j.position }));
    await fetch("/api/jobs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates }),
    });
  }

  return (
    <div className="min-h-screen text-ink">
      <TopNav
        rightSlot={
          <>
            {discoverState.lastRun && (
              <span className="text-caption text-ink-tertiary">
                Auto-refresh · {formatAgo(discoverState.lastRun)}
              </span>
            )}
            <button
              onClick={() => runDiscover()}
              disabled={discoverState.running}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-hairline bg-surface-1 px-3 text-button text-ink hover:bg-surface-2 hover:border-hairline-strong transition-colors disabled:opacity-50"
              title={
                discoverState.lastRun
                  ? `Last fetched ${formatAgo(discoverState.lastRun)} · ${
                      discoverState.lastReport?.inserted ?? 0
                    } new · ${discoverState.lastReport?.filtered ?? 0} filtered out`
                  : "Fetch new jobs from your saved searches"
              }
            >
              {discoverState.running ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {discoverState.running ? "Fetching…" : "Refresh"}
            </button>
            <Button variant="primary" size="md" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Add job
            </Button>
          </>
        }
      />

      <main className="page-enter px-4 pt-8 pb-24">
        <SuggestionsBar onChange={refresh} />
        <TodayBanner jobs={jobs} />
        <div className="mb-6 flex items-end justify-between gap-4 px-2">
          <div>
            <h1 className="text-headline text-ink">Pipeline</h1>
            <p className="mt-1 text-body-sm text-ink-subtle">
              {jobs.length} {jobs.length === 1 ? "role" : "roles"} tracked.
              {discoverState.lastReport && discoverState.lastReport.inserted > 0 && (
                <span className="text-success">
                  {" "}
                  · {discoverState.lastReport.inserted} new from Refresh
                </span>
              )}
            </p>
          </div>
          <div className="relative w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-tertiary" />
            <input
              type="text"
              placeholder="Search cards by title, company, location…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-md border border-hairline bg-surface-1 pl-8 pr-3 text-body-sm text-ink placeholder:text-ink-tertiary focus:border-hairline-strong focus:outline-none focus:ring-2 focus:ring-primary-focus/50"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center text-body-sm text-ink-subtle">
            Loading…
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
          >
            <div className="overflow-x-auto pb-2">
              <div className="grid gap-3 min-w-[1200px]" style={{ gridTemplateColumns: "repeat(6, minmax(180px, 1fr))" }}>
                {STATUSES.map((s) => (
                  <Column
                    key={s}
                    status={s}
                    jobs={jobsByStatus(s)}
                    sort={sorts[s]}
                    onSortChange={(k) => setSorts((p) => ({ ...p, [s]: k }))}
                    onOpen={setDetailJob}
                    onDismiss={dismissJob}
                    onMove={moveJob}
                    onApply={applyJob}
                    onBulkDelete={deleteJobs}
                  />
                ))}
              </div>
            </div>
            <DragOverlay>{activeJob && <JobCardVisual job={activeJob} overlay />}</DragOverlay>
          </DndContext>
        )}
      </main>

      <AddJobDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={async () => {
          await refresh();
        }}
      />
      <JobDetailDialog
        job={detailJob}
        onClose={() => setDetailJob(null)}
        onChange={refresh}
      />
    </div>
  );
}

function TodayBanner({ jobs }: { jobs: JobDTO[] }) {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();

  const followUpDue = jobs.filter(
    (j) => j.followUpAt && new Date(j.followUpAt).getTime() < tomorrow
  );
  const interviewsToday = jobs.filter((j) => {
    if (!j.interviewAt) return false;
    const d = new Date(j.interviewAt);
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  });

  if (followUpDue.length === 0 && interviewsToday.length === 0) return null;

  return (
    <div className="mb-4 mx-2 rounded-md border border-hairline bg-surface-1 px-4 py-2.5 edge-highlight flex items-center gap-4 flex-wrap">
      <span className="text-eyebrow uppercase text-ink-tertiary">Today</span>
      {followUpDue.length > 0 && (
        <span className="text-body-sm text-ink-muted">
          <span className="text-[#f5a623] font-medium">{followUpDue.length}</span> follow-up
          {followUpDue.length === 1 ? "" : "s"} due
        </span>
      )}
      {interviewsToday.length > 0 && (
        <span className="text-body-sm text-ink-muted">
          <span className="text-primary font-medium">{interviewsToday.length}</span> interview
          {interviewsToday.length === 1 ? "" : "s"} scheduled
        </span>
      )}
    </div>
  );
}

function formatAgo(ts: number): string {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}
