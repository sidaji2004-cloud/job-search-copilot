import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { STATUSES, type Status } from "@/lib/types";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const job = await prisma.job.findUnique({
    where: { id },
    include: { generations: true },
  });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ job });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = (await req.json()) as Partial<{
    title: string;
    company: string;
    location: string | null;
    url: string | null;
    description: string;
    status: Status;
    position: number;
    notes: string | null;
    appliedAt: string | null;
    followUpAt: string | null;
    interviewAt: string | null;
  }>;

  if (body.status && !STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const data: Record<string, unknown> = { ...body };
  for (const k of ["appliedAt", "followUpAt", "interviewAt"] as const) {
    if (k in data) {
      const v = data[k];
      data[k] = v ? new Date(v as string) : null;
    }
  }

  const job = await prisma.job.update({
    where: { id },
    data,
  });
  return NextResponse.json({ job });
}

const VALID_REASONS = new Set([
  "WRONG_FUNCTION",
  "WRONG_STAGE",
  "BAD_COMPANY",
  "NOT_INTERESTED",
  "UNSPECIFIED",
]);

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const url = new URL(req.url);
  const reasonParam = url.searchParams.get("reason");
  const reason = reasonParam && VALID_REASONS.has(reasonParam) ? reasonParam : null;

  if (reason) {
    const job = await prisma.job.findUnique({ where: { id } });
    if (job) {
      await prisma.dismissal.create({
        data: {
          jobTitle: job.title,
          company: job.company,
          source: job.source,
          fitScore: job.fitScore,
          reason,
        },
      });
    }
  }

  await prisma.job.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
