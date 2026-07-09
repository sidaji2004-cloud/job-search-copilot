import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { refreshAllSkillDemand } from "@/lib/market-demand";

export const runtime = "nodejs";

/**
 * POST /api/skills/refresh-demand
 *
 * Pulls a live Adzuna listing count per skill, scans the user's active
 * pipeline for skill mentions, blends the two signals, and updates every
 * Skill.marketDemand + captures a MarketDemandSnapshot row per skill.
 *
 * Returns { refreshed, changes: [{name, from, to, error?}] } for a toast.
 */
export async function POST() {
  const skills = await prisma.skill.findMany({
    orderBy: { position: "asc" },
    select: { id: true, name: true, marketDemand: true },
  });

  // Only consider jobs the user has actively engaged with — noise elsewhere.
  const jobs = await prisma.job.findMany({
    where: { status: { in: ["INBOX", "WISHLIST", "APPLIED"] } },
    select: { description: true },
  });

  let results;
  try {
    results = await refreshAllSkillDemand(skills, jobs);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Adzuna failed" },
      { status: 500 }
    );
  }

  const now = new Date();
  await prisma.$transaction(
    results.flatMap((r) => [
      prisma.skill.update({
        where: { id: r.skillId },
        data: { marketDemand: r.next, marketDemandUpdatedAt: now },
      }),
      prisma.marketDemandSnapshot.create({
        data: {
          skillId: r.skillId,
          marketDemand: r.next,
          adzunaCount: r.adzunaCount,
          jobsMatching: r.jobsMatching,
          capturedAt: now,
        },
      }),
    ])
  );

  const changes = results.map((r) => ({
    name: r.name,
    from: r.previous,
    to: r.next,
    error: r.error,
  }));

  return NextResponse.json({
    ok: true,
    refreshed: results.length,
    at: now.toISOString(),
    changes,
  });
}

/**
 * GET /api/skills/refresh-demand
 * Returns the last-refreshed timestamp (max marketDemandUpdatedAt across skills)
 * so the /skills page can render "Refreshed X ago" without an extra table.
 */
export async function GET() {
  const latest = await prisma.skill.findFirst({
    where: { marketDemandUpdatedAt: { not: null } },
    orderBy: { marketDemandUpdatedAt: "desc" },
    select: { marketDemandUpdatedAt: true },
  });
  return NextResponse.json({
    lastRefreshedAt: latest?.marketDemandUpdatedAt?.toISOString() ?? null,
  });
}
