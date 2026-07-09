import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const suggestions = await prisma.suggestion.findMany({
    where: { resolved: false },
    orderBy: { receivedAt: "desc" },
    take: 20,
  });
  // Annotate with job title/company for jobs that still exist.
  const jobIds = suggestions.map((s) => s.jobId).filter((v): v is string => v != null);
  const jobs = jobIds.length
    ? await prisma.job.findMany({
        where: { id: { in: jobIds } },
        select: { id: true, title: true, company: true, status: true },
      })
    : [];
  const jobMap = new Map(jobs.map((j) => [j.id, j]));
  const enriched = suggestions.map((s) => ({
    ...s,
    job: s.jobId ? jobMap.get(s.jobId) ?? null : null,
  }));
  return NextResponse.json({ suggestions: enriched });
}

/** PATCH /api/suggestions?id=… body: { resolved: true } */
export async function PATCH(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const body = (await req.json()) as { resolved?: boolean };
  await prisma.suggestion.update({
    where: { id },
    data: { resolved: body.resolved ?? true },
  });
  return NextResponse.json({ ok: true });
}
