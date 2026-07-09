import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { passesTargetFilter } from "@/lib/filter";
import type { JobCandidate } from "@/lib/sources/types";

export const runtime = "nodejs";

/**
 * One-shot housekeeping endpoint:
 *   1. Hard-delete every job in REJECTED.
 *   2. Run the current target filter against every job in INBOX and delete
 *      anything that no longer matches.
 *
 * Safe to call repeatedly — idempotent. Wired to a button in /settings.
 */
export async function POST() {
  const rejectedDeleted = await prisma.job.deleteMany({
    where: { status: "REJECTED" },
  });

  const inboxJobs = await prisma.job.findMany({ where: { status: "INBOX" } });
  const toDelete: string[] = [];
  for (const j of inboxJobs) {
    const candidate: JobCandidate = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      source: (j.source as any) ?? "MANUAL",
      externalId: j.externalId ?? "",
      title: j.title,
      company: j.company,
      location: j.location,
      url: j.url ?? "",
      description: j.description,
    };
    if (!passesTargetFilter(candidate).ok) toDelete.push(j.id);
  }

  let inboxFilteredCount = 0;
  if (toDelete.length > 0) {
    const r = await prisma.job.deleteMany({ where: { id: { in: toDelete } } });
    inboxFilteredCount = r.count;
  }

  return NextResponse.json({
    ok: true,
    rejectedDeleted: rejectedDeleted.count,
    inboxFilteredOut: inboxFilteredCount,
    inboxKept: inboxJobs.length - inboxFilteredCount,
  });
}
