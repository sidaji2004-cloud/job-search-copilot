import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { SkillCategory, SkillDTO, SkillLogDTO, SkillsSummary } from "@/lib/types";

export const runtime = "nodejs";

/**
 * GET /api/skills
 * Returns all skills (ordered by position), the last 10 logs, and a computed summary.
 */
export async function GET() {
  const [skills, recentLogs] = await Promise.all([
    prisma.skill.findMany({ orderBy: { position: "asc" } }),
    prisma.skillLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { skill: { select: { name: true } } },
    }),
  ]);

  const skillDTOs: SkillDTO[] = skills.map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category as SkillCategory,
    marketDemand: s.marketDemand,
    currentLevel: Math.round(s.currentLevel * 10) / 10,
    position: s.position,
    resourceUrl: s.resourceUrl,
    resourceName: s.resourceName,
    updatedAt: s.updatedAt.toISOString(),
  }));

  const logDTOs: SkillLogDTO[] = recentLogs.map((l) => ({
    id: l.id,
    skillId: l.skillId,
    skillName: l.skill.name,
    hours: l.hours,
    note: l.note,
    levelGain: Math.round(l.levelGain * 100) / 100,
    createdAt: l.createdAt.toISOString(),
  }));

  // Summary — matches the metric strip from the analysis visualization.
  let criticalGaps = 0;
  let strengths = 0;
  let weightedNumerator = 0;
  let weightedDenominator = 0;
  for (const s of skills) {
    const gap = s.marketDemand - s.currentLevel;
    if (gap >= 4) criticalGaps++;
    if (s.currentLevel >= s.marketDemand) strengths++;
    weightedNumerator += Math.min(s.currentLevel, s.marketDemand);
    weightedDenominator += s.marketDemand;
  }
  const marketReadiness =
    weightedDenominator > 0
      ? Math.round((weightedNumerator / weightedDenominator) * 100)
      : 0;

  const summary: SkillsSummary = {
    criticalGaps,
    strengths,
    marketReadiness,
    goal: 82,
  };

  return NextResponse.json({ skills: skillDTOs, recentLogs: logDTOs, summary });
}
