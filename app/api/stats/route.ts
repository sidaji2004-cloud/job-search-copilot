import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Funnel + rejection + source analytics.
 * Query param: ?range=all | 30 | 7  (days)
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const range = url.searchParams.get("range") ?? "all";
  const sinceDate =
    range === "all"
      ? null
      : new Date(Date.now() - parseInt(range, 10) * 24 * 60 * 60 * 1000);

  const jobWhere = sinceDate ? { createdAt: { gte: sinceDate } } : {};
  const dismissalWhere = sinceDate ? { createdAt: { gte: sinceDate } } : {};

  const [jobs, dismissals] = await Promise.all([
    prisma.job.findMany({
      where: jobWhere,
      select: { status: true, source: true, appliedAt: true },
    }),
    prisma.dismissal.findMany({ where: dismissalWhere, select: { reason: true, source: true } }),
  ]);

  // Funnel — counts by status. "Wishlist" includes all jobs that have ever
  // been on the board within the time window; later stages are subsets.
  const totalTracked = jobs.length;
  const applied = jobs.filter((j) => j.appliedAt != null || j.status === "APPLIED" || j.status === "INTERVIEWING" || j.status === "OFFER").length;
  const interviewing = jobs.filter((j) => j.status === "INTERVIEWING" || j.status === "OFFER").length;
  const offers = jobs.filter((j) => j.status === "OFFER").length;
  const rejected = jobs.filter((j) => j.status === "REJECTED").length + dismissals.length;

  const funnel = {
    tracked: totalTracked,
    applied,
    interviewing,
    offers,
    rejected,
    appliedRate: totalTracked > 0 ? Math.round((applied / totalTracked) * 100) : 0,
    interviewRate: applied > 0 ? Math.round((interviewing / applied) * 100) : 0,
    offerRate: interviewing > 0 ? Math.round((offers / interviewing) * 100) : 0,
  };

  // Rejection breakdown
  const reasonCounts: Record<string, number> = {
    WRONG_FUNCTION: 0,
    WRONG_STAGE: 0,
    BAD_COMPANY: 0,
    NOT_INTERESTED: 0,
    UNSPECIFIED: 0,
  };
  for (const d of dismissals) {
    reasonCounts[d.reason] = (reasonCounts[d.reason] ?? 0) + 1;
  }
  const totalDismissals = dismissals.length;
  const rejections = Object.entries(reasonCounts).map(([reason, count]) => ({
    reason,
    count,
    pct: totalDismissals > 0 ? Math.round((count / totalDismissals) * 100) : 0,
  }));

  // Source quality — imported vs applied
  const sourceMap = new Map<string, { imported: number; applied: number }>();
  for (const j of jobs) {
    const cur = sourceMap.get(j.source) ?? { imported: 0, applied: 0 };
    cur.imported++;
    if (j.appliedAt != null || j.status === "APPLIED" || j.status === "INTERVIEWING" || j.status === "OFFER") {
      cur.applied++;
    }
    sourceMap.set(j.source, cur);
  }
  const sources = Array.from(sourceMap.entries()).map(([source, v]) => ({
    source,
    imported: v.imported,
    applied: v.applied,
    rate: v.imported > 0 ? Math.round((v.applied / v.imported) * 100) : 0,
  }));

  return NextResponse.json({ funnel, rejections, sources, range });
}
