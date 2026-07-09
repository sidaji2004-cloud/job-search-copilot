import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/**
 * DELETE /api/skills/log/:id
 * Reverses the levelGain on the parent skill, then removes the log row.
 * Used by the "Undo" affordance in the activity feed.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const result = await prisma.$transaction(async (tx) => {
    const log = await tx.skillLog.findUnique({ where: { id } });
    if (!log) return null;
    const skill = await tx.skill.findUnique({ where: { id: log.skillId } });
    if (!skill) {
      await tx.skillLog.delete({ where: { id } });
      return { reversed: 0 };
    }
    const newLevel = Math.max(0, skill.currentLevel - log.levelGain);
    await tx.skill.update({ where: { id: skill.id }, data: { currentLevel: newLevel } });
    await tx.skillLog.delete({ where: { id } });
    return { reversed: log.levelGain, skillId: skill.id, newLevel: Math.round(newLevel * 10) / 10 };
  });

  if (!result) {
    return NextResponse.json({ error: "log not found" }, { status: 404 });
  }
  return NextResponse.json(result);
}
