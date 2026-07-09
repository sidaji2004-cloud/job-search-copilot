import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { gmailConfigured } from "@/lib/suggestions/gmail";

export const runtime = "nodejs";

export async function GET() {
  const configured = gmailConfigured();
  const token = configured ? await prisma.gmailToken.findUnique({ where: { id: 1 } }) : null;
  const unresolved = await prisma.suggestion.count({ where: { resolved: false } });
  return NextResponse.json({
    configured,
    connected: Boolean(token?.refreshToken),
    lastPolledAt: token?.lastPolledAt ?? null,
    unresolved,
  });
}
