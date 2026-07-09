import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SKILL_BASE_RATE, type SkillCategory } from "@/lib/types";

export const runtime = "nodejs";

/**
 * POST /api/skills/log
 * Body: { skillId, hours, note? }
 * Computes levelGain = hours × baseRate(category) × (1 - currentLevel / 14),
 * caps the resulting level at 10, and atomically updates Skill.currentLevel.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.skillId !== "string" || typeof body.hours !== "number") {
    return NextResponse.json({ error: "skillId and hours are required" }, { status: 400 });
  }
  const hours = Math.max(0.25, Math.min(24, body.hours));
  const note = typeof body.note === "string" ? body.note.slice(0, 200) : null;

  const result = await prisma.$transaction(async (tx) => {
    const skill = await tx.skill.findUnique({ where: { id: body.skillId } });
    if (!skill) return null;

    const baseRate = SKILL_BASE_RATE[skill.category as SkillCategory] ?? 0.3;
    const rawGain = hours * baseRate * (1 - skill.currentLevel / 14);
    const levelGain = Math.max(0, rawGain);
    const newLevel = Math.min(10, skill.currentLevel + levelGain);
    const actualGain = newLevel - skill.currentLevel;

    const log = await tx.skillLog.create({
      data: {
        skillId: skill.id,
        hours,
        note,
        levelGain: actualGain,
      },
    });
    const updated = await tx.skill.update({
      where: { id: skill.id },
      data: { currentLevel: newLevel },
    });
    return { log, updated };
  });

  if (!result) {
    return NextResponse.json({ error: "skill not found" }, { status: 404 });
  }

  return NextResponse.json({
    log: {
      id: result.log.id,
      skillId: result.log.skillId,
      skillName: result.updated.name,
      hours: result.log.hours,
      note: result.log.note,
      levelGain: Math.round(result.log.levelGain * 100) / 100,
      createdAt: result.log.createdAt.toISOString(),
    },
    skill: {
      id: result.updated.id,
      currentLevel: Math.round(result.updated.currentLevel * 10) / 10,
    },
  });
}
