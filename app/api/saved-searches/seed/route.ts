import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  ADZUNA_DEFAULT_QUERIES,
  GREENHOUSE_DEFAULT_COMPANIES,
  LEVER_DEFAULT_COMPANIES,
} from "@/lib/seed-searches";

export const runtime = "nodejs";

/**
 * Idempotent bulk-insert of the curated seed library.
 * Dedupes against existing rows by (kind, query, country) so re-running
 * never creates duplicates and any rows you've manually added are preserved.
 */
export async function POST() {
  const existing = await prisma.savedSearch.findMany({
    select: { kind: true, query: true, country: true },
  });
  const seen = new Set(
    existing.map((s) => `${s.kind}::${s.query.toLowerCase()}::${(s.country ?? "").toLowerCase()}`)
  );

  let added = 0;
  let skipped = 0;

  for (const a of ADZUNA_DEFAULT_QUERIES) {
    const key = `ADZUNA::${a.query.toLowerCase()}::${a.country.toLowerCase()}`;
    if (seen.has(key)) {
      skipped++;
      continue;
    }
    await prisma.savedSearch.create({
      data: {
        kind: "ADZUNA",
        query: a.query,
        location: a.location,
        country: a.country,
      },
    });
    seen.add(key);
    added++;
  }

  for (const slug of GREENHOUSE_DEFAULT_COMPANIES) {
    const key = `GREENHOUSE::${slug.toLowerCase()}::`;
    if (seen.has(key)) {
      skipped++;
      continue;
    }
    await prisma.savedSearch.create({
      data: { kind: "GREENHOUSE", query: slug },
    });
    seen.add(key);
    added++;
  }

  for (const slug of LEVER_DEFAULT_COMPANIES) {
    const key = `LEVER::${slug.toLowerCase()}::`;
    if (seen.has(key)) {
      skipped++;
      continue;
    }
    await prisma.savedSearch.create({
      data: { kind: "LEVER", query: slug },
    });
    seen.add(key);
    added++;
  }

  return NextResponse.json({ ok: true, added, skipped });
}

/**
 * GET — preview how many seeds would be added vs already present.
 * Used by the Settings UI to show "Already added: X of Y".
 */
export async function GET() {
  const existing = await prisma.savedSearch.findMany({
    select: { kind: true, query: true, country: true },
  });
  const seen = new Set(
    existing.map((s) => `${s.kind}::${s.query.toLowerCase()}::${(s.country ?? "").toLowerCase()}`)
  );

  let total = 0;
  let present = 0;
  for (const a of ADZUNA_DEFAULT_QUERIES) {
    total++;
    if (seen.has(`ADZUNA::${a.query.toLowerCase()}::${a.country.toLowerCase()}`)) present++;
  }
  for (const slug of GREENHOUSE_DEFAULT_COMPANIES) {
    total++;
    if (seen.has(`GREENHOUSE::${slug.toLowerCase()}::`)) present++;
  }
  for (const slug of LEVER_DEFAULT_COMPANIES) {
    total++;
    if (seen.has(`LEVER::${slug.toLowerCase()}::`)) present++;
  }

  return NextResponse.json({ total, present, missing: total - present });
}
