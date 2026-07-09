import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/**
 * PATCH /api/skills/:id
 * One-time calibration affordance — allows editing currentLevel directly.
 * Used when the seeded starting level doesn't match the user's actual level.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body.currentLevel !== "number") {
    return NextResponse.json({ error: "currentLevel (number) required" }, { status: 400 });
  }
  const clamped = Math.min(10, Math.max(0, body.currentLevel));
  const updated = await prisma.skill.update({
    where: { id },
    data: { currentLevel: clamped },
  });
  return NextResponse.json({
    id: updated.id,
    currentLevel: Math.round(updated.currentLevel * 10) / 10,
  });
}
