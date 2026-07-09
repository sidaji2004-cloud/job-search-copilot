"use client";

import { useEffect, useState } from "react";
import { TopNav } from "@/components/TopNav";
import { cn } from "@/lib/cn";

type StatsResponse = {
  funnel: {
    tracked: number;
    applied: number;
    interviewing: number;
    offers: number;
    rejected: number;
    appliedRate: number;
    interviewRate: number;
    offerRate: number;
  };
  rejections: { reason: string; count: number; pct: number }[];
  sources: { source: string; imported: number; applied: number; rate: number }[];
};

const RANGES: { value: string; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "30", label: "Last 30 days" },
  { value: "7", label: "Last 7 days" },
];

const REASON_LABEL: Record<string, string> = {
  WRONG_FUNCTION: "Wrong function",
  WRONG_STAGE: "Wrong stage / seniority",
  BAD_COMPANY: "Bad company",
  NOT_INTERESTED: "Not interested",
  UNSPECIFIED: "No reason given",
};

const SOURCE_LABEL: Record<string, string> = {
  ADZUNA: "Adzuna",
  GREENHOUSE: "Greenhouse",
  LEVER: "Lever",
  MANUAL: "Manual",
  BOOKMARKLET: "Bookmarklet",
};

export default function StatsPage() {
  const [range, setRange] = useState("all");
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void fetch(`/api/stats?range=${range}`)
      .then((r) => r.json())
      .then((d: StatsResponse) => {
        setData(d);
        setLoading(false);
      });
  }, [range]);

  return (
    <div className="min-h-screen text-ink">
      <TopNav />
      <main className="page-enter mx-auto max-w-4xl px-6 pt-10 pb-24 space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-headline text-ink">Stats</h1>
            <p className="mt-1 text-body-sm text-ink-subtle">
              Your application funnel, rejection patterns, and which sources actually deliver.
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-md border border-hairline bg-surface-1 p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={cn(
                  "rounded px-3 py-1 text-caption transition-colors",
                  range === r.value
                    ? "bg-surface-2 text-ink"
                    : "text-ink-tertiary hover:text-ink-subtle"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {loading || !data ? (
          <div className="flex h-64 items-center justify-center text-body-sm text-ink-subtle">
            Loading…
          </div>
        ) : (
          <>
            <FunnelCard funnel={data.funnel} />
            <RejectionCard rejections={data.rejections} />
            <SourceCard sources={data.sources} />
          </>
        )}
      </main>
    </div>
  );
}

function FunnelCard({ funnel }: { funnel: StatsResponse["funnel"] }) {
  const stages = [
    { label: "Tracked", count: funnel.tracked, rate: null as number | null },
    { label: "Applied", count: funnel.applied, rate: funnel.appliedRate },
    { label: "Interviewing", count: funnel.interviewing, rate: funnel.interviewRate },
    { label: "Offer", count: funnel.offers, rate: funnel.offerRate },
    { label: "Rejected", count: funnel.rejected, rate: null as number | null },
  ];
  const max = Math.max(1, ...stages.map((s) => s.count));

  return (
    <section className="rounded-lg border border-hairline bg-surface-1 p-6 edge-highlight">
      <h2 className="text-card-title text-ink">Application funnel</h2>
      <p className="mt-1 text-body-sm text-ink-subtle">
        Conversion at every stage. Lower numbers mean tighter filters or stronger applications.
      </p>
      <div className="mt-5 space-y-2">
        {stages.map((s) => (
          <div key={s.label} className="flex items-center gap-3">
            <div className="w-32 flex-none text-body-sm text-ink-subtle">{s.label}</div>
            <div className="flex-1 relative h-6 rounded-md bg-surface-2 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-primary/40"
                style={{ width: `${(s.count / max) * 100}%` }}
              />
              <div className="absolute inset-0 flex items-center px-2 text-caption text-ink">
                {s.count}
              </div>
            </div>
            <div className="w-20 flex-none text-right text-caption text-ink-tertiary">
              {s.rate != null ? `${s.rate}%` : ""}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RejectionCard({ rejections }: { rejections: StatsResponse["rejections"] }) {
  const total = rejections.reduce((sum, r) => sum + r.count, 0);
  if (total === 0) {
    return (
      <section className="rounded-lg border border-hairline bg-surface-1 p-6 edge-highlight">
        <h2 className="text-card-title text-ink">Rejection patterns</h2>
        <p className="mt-1 text-body-sm text-ink-subtle">
          No dismissals yet. As you reject roles, this card will show what kind of mismatches
          dominate so you can tighten your filter.
        </p>
      </section>
    );
  }
  const max = Math.max(...rejections.map((r) => r.count));
  return (
    <section className="rounded-lg border border-hairline bg-surface-1 p-6 edge-highlight">
      <h2 className="text-card-title text-ink">Rejection patterns</h2>
      <p className="mt-1 text-body-sm text-ink-subtle">
        Why you reject roles. A dominant reason means the filter is letting too many of those
        through — tighten it.
      </p>
      <div className="mt-5 space-y-2">
        {rejections
          .filter((r) => r.count > 0)
          .sort((a, b) => b.count - a.count)
          .map((r) => (
            <div key={r.reason} className="flex items-center gap-3">
              <div className="w-44 flex-none text-body-sm text-ink-subtle">
                {REASON_LABEL[r.reason] ?? r.reason}
              </div>
              <div className="flex-1 relative h-6 rounded-md bg-surface-2 overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-primary/40"
                  style={{ width: `${(r.count / max) * 100}%` }}
                />
                <div className="absolute inset-0 flex items-center px-2 text-caption text-ink">
                  {r.count}
                </div>
              </div>
              <div className="w-12 flex-none text-right text-caption text-ink-tertiary">
                {r.pct}%
              </div>
            </div>
          ))}
      </div>
    </section>
  );
}

function SourceCard({ sources }: { sources: StatsResponse["sources"] }) {
  if (sources.length === 0) {
    return null;
  }
  const sorted = [...sources].sort((a, b) => b.imported - a.imported);
  const max = Math.max(...sorted.map((s) => s.imported));
  return (
    <section className="rounded-lg border border-hairline bg-surface-1 p-6 edge-highlight">
      <h2 className="text-card-title text-ink">Source quality</h2>
      <p className="mt-1 text-body-sm text-ink-subtle">
        How many roles each source delivers, and what fraction you actually apply to.
      </p>
      <div className="mt-5 space-y-2">
        {sorted.map((s) => (
          <div key={s.source} className="flex items-center gap-3">
            <div className="w-32 flex-none text-body-sm text-ink-subtle">
              {SOURCE_LABEL[s.source] ?? s.source}
            </div>
            <div className="flex-1 relative h-6 rounded-md bg-surface-2 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-primary/40"
                style={{ width: `${(s.imported / max) * 100}%` }}
              />
              <div className="absolute inset-0 flex items-center px-2 text-caption text-ink">
                {s.imported} imported · {s.applied} applied
              </div>
            </div>
            <div className="w-12 flex-none text-right text-caption text-ink-tertiary">
              {s.rate}%
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
