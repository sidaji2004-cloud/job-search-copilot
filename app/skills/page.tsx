"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TopNav } from "@/components/TopNav";
import { SkillsBar } from "@/components/SkillsBar";
import { SkillsMetricStrip } from "@/components/SkillsMetricStrip";
import { ActivityFeed } from "@/components/ActivityFeed";
import { LogPracticeDialog } from "@/components/LogPracticeDialog";
import { Button } from "@/components/ui/Button";
import { Code2, Wrench, LineChart, Sparkles, Plus, RefreshCw } from "lucide-react";
import type { SkillCategory, SkillDTO, SkillLogDTO, SkillsSummary } from "@/lib/types";

type SkillsResponse = {
  skills: SkillDTO[];
  recentLogs: SkillLogDTO[];
  summary: SkillsSummary;
};

const QUADRANTS: {
  category: SkillCategory;
  title: string;
  caption: string;
  Icon: typeof Code2;
  accent: string;
}[] = [
  { category: "TECHNICAL",  title: "Technical",  caption: "Languages + querying",      Icon: Code2,     accent: "text-sky-400" },
  { category: "TOOLS",      title: "Tools",      caption: "What teams actually use",   Icon: Wrench,    accent: "text-amber-400" },
  { category: "ANALYTICAL", title: "Analytical", caption: "Frameworks + judgment",     Icon: LineChart, accent: "text-emerald-400" },
  { category: "AI",         title: "AI",         caption: "Your differentiator",       Icon: Sparkles,  accent: "text-primary" },
];

export default function SkillsPage() {
  const [data, setData] = useState<SkillsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [initialSkillId, setInitialSkillId] = useState<string | null>(null);
  const [glowSkillId, setGlowSkillId] = useState<string | null>(null);
  const [demandRefreshing, setDemandRefreshing] = useState(false);
  const [lastDemandRefresh, setLastDemandRefresh] = useState<string | null>(null);
  const [demandToast, setDemandToast] = useState<string | null>(null);
  const [demandGlowIds, setDemandGlowIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    const res = await fetch("/api/skills");
    const d: SkillsResponse = await res.json();
    setData(d);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    void fetch("/api/skills/refresh-demand")
      .then((r) => r.json())
      .then((d: { lastRefreshedAt: string | null }) => setLastDemandRefresh(d.lastRefreshedAt))
      .catch(() => null);
  }, [load]);

  async function refreshDemand() {
    if (demandRefreshing) return;
    setDemandRefreshing(true);
    const previous = new Map((data?.skills ?? []).map((s) => [s.id, s.marketDemand]));
    try {
      const res = await fetch("/api/skills/refresh-demand", { method: "POST" });
      const body = (await res.json()) as {
        ok: boolean;
        refreshed?: number;
        at?: string;
        changes?: { name: string; from: number; to: number; error?: string }[];
        error?: string;
      };
      if (!res.ok || !body.ok) {
        setDemandToast(body.error ?? "Refresh failed");
      } else {
        const movers = (body.changes ?? []).filter((c) => c.from !== c.to);
        const failures = (body.changes ?? []).filter((c) => c.error).length;
        const summary =
          movers.length === 0
            ? `Refreshed ${body.refreshed} skills · no changes`
            : `Refreshed ${body.refreshed} · biggest movers: ${movers
                .sort((a, b) => Math.abs(b.to - b.from) - Math.abs(a.to - a.from))
                .slice(0, 3)
                .map((c) => `${c.name.split(" ")[0]} ${c.from}→${c.to}`)
                .join(" · ")}`;
        setDemandToast(failures > 0 ? `${summary} · ${failures} failed` : summary);
        setLastDemandRefresh(body.at ?? new Date().toISOString());
        await load();
        // Glow the rows whose demand actually shifted.
        const refreshed = await fetch("/api/skills").then((r) => r.json() as Promise<SkillsResponse>);
        const changed = refreshed.skills
          .filter((s) => (previous.get(s.id) ?? s.marketDemand) !== s.marketDemand)
          .map((s) => s.id);
        if (changed.length > 0) {
          setDemandGlowIds(new Set(changed));
          window.setTimeout(() => setDemandGlowIds(new Set()), 1600);
        }
      }
    } catch (e) {
      setDemandToast(e instanceof Error ? e.message : "Network error");
    } finally {
      setDemandRefreshing(false);
      window.setTimeout(() => setDemandToast(null), 4200);
    }
  }

  function relativeAgo(iso: string | null): string {
    if (!iso) return "never";
    const diffMs = Date.now() - Date.parse(iso);
    if (diffMs < 60_000) return "just now";
    const mins = Math.round(diffMs / 60_000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    return `${days}d ago`;
  }

  const byCategory = useMemo(() => {
    const map = new Map<SkillCategory, SkillDTO[]>();
    QUADRANTS.forEach((q) => map.set(q.category, []));
    if (data) for (const s of data.skills) map.get(s.category)?.push(s);
    return map;
  }, [data]);

  function openLog(skill: SkillDTO) {
    setInitialSkillId(skill.id);
    setDialogOpen(true);
  }

  async function handleLogged() {
    const previousSkills = data?.skills ?? [];
    const res = await fetch("/api/skills");
    const next: SkillsResponse = await res.json();
    const changed = next.skills.find(
      (s) => (previousSkills.find((p) => p.id === s.id)?.currentLevel ?? -1) !== s.currentLevel
    );
    setData(next);
    if (changed) {
      setGlowSkillId(changed.id);
      window.setTimeout(() => setGlowSkillId(null), 1300);
    }
  }

  async function handleUndo(logId: string) {
    const res = await fetch(`/api/skills/log/${logId}`, { method: "DELETE" });
    if (!res.ok) return;
    await load();
  }

  return (
    <div className="min-h-screen text-ink">
      <TopNav />
      <main className="page-enter mx-auto max-w-5xl px-6 pt-8 pb-12 space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-headline text-ink">Skills gap</h1>
            <p className="mt-1 text-body-sm text-ink-subtle">
              Demand vs. you, in one view. Log every hour and watch the green close on lavender.
            </p>
            <p className="mt-1 text-[11px] text-ink-tertiary">
              Market demand refreshed {relativeAgo(lastDemandRefresh)}
              <button
                onClick={refreshDemand}
                disabled={demandRefreshing}
                className="ml-2 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-ink-subtle hover:text-ink hover:bg-surface-2 transition-colors disabled:opacity-50"
                title="Pull fresh market demand from Adzuna + your pipeline"
              >
                <RefreshCw className={`h-3 w-3 ${demandRefreshing ? "animate-spin" : ""}`} />
                {demandRefreshing ? "refreshing…" : "refresh"}
              </button>
            </p>
            {demandToast ? (
              <p className="mt-2 text-[11px] text-primary/90">{demandToast}</p>
            ) : null}
          </div>
          <Button
            variant="primary"
            onClick={() => {
              setInitialSkillId(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            Log practice
          </Button>
        </div>

        {loading || !data ? (
          <div className="flex h-64 items-center justify-center text-body-sm text-ink-subtle">
            Loading…
          </div>
        ) : (
          <>
            <SkillsMetricStrip summary={data.summary} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {QUADRANTS.map((q, qi) => {
                const skills = byCategory.get(q.category) ?? [];
                return (
                  <section
                    key={q.category}
                    className="glossy rounded-lg border border-hairline p-4 row-enter"
                    style={{ animationDelay: `${qi * 70}ms` }}
                  >
                    <header className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <q.Icon className={`h-4 w-4 ${q.accent}`} />
                        <h2 className="text-body-sm font-medium text-ink">{q.title}</h2>
                      </div>
                      <p className="text-[11px] text-ink-tertiary">{q.caption}</p>
                    </header>
                    <div className="space-y-1">
                      {skills.map((s, i) => (
                        <SkillsBar
                          key={s.id}
                          skill={s}
                          index={qi * 4 + i}
                          recentlyUpdated={s.id === glowSkillId || demandGlowIds.has(s.id)}
                          onLog={openLog}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>

            <ActivityFeed logs={data.recentLogs} onUndo={handleUndo} />

            <p className="text-[11px] text-ink-tertiary">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary/40 align-middle mr-1.5" />
              Market demand
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400/85 align-middle mr-1.5 ml-4" />
              Your current level
              <span className="ml-4 text-ink-tertiary/80">Hover any row to reveal the quick-log button.</span>
            </p>
          </>
        )}
      </main>

      {data ? (
        <LogPracticeDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          skills={data.skills}
          initialSkillId={initialSkillId}
          onLogged={handleLogged}
        />
      ) : null}
    </div>
  );
}
