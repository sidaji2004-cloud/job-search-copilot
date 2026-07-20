/**
 * One-shot restore of saved searches to Neon after the SQLite -> Postgres
 * migration. Mirrors app/api/saved-searches/seed/route.ts (curated library)
 * plus the 21 custom domain-specific Adzuna queries added earlier.
 * Idempotent — safe to re-run.
 */
import { PrismaClient } from "@prisma/client";
import {
  ADZUNA_DEFAULT_QUERIES,
  GREENHOUSE_DEFAULT_COMPANIES,
  LEVER_DEFAULT_COMPANIES,
} from "../lib/seed-searches";

const prisma = new PrismaClient();

const CUSTOM_QUERIES = [
  "Operations Associate",
  "Business Operations Associate",
  "Operations Analyst fresher",
  "Associate Project Manager",
  "Project Coordinator",
  "Project Management Trainee",
  "Strategy Associate",
  "Business Strategy Analyst",
  "Corporate Strategy Trainee",
  "Associate Consultant",
  "Business Analyst Consulting",
  "Graduate Consultant",
  "Product Operations Associate",
  "Product Analyst",
  "Product Coordinator",
  "Business Operations Associate fresher",
  "Revenue Operations Associate",
  "Founder's Office Associate",
  "Sales Development Representative",
  "Business Development Executive",
  "Business Development Associate",
];

async function main() {
  const existing = await prisma.savedSearch.findMany({
    select: { kind: true, query: true, country: true },
  });
  const seen = new Set(
    existing.map((s) => `${s.kind}::${s.query.toLowerCase()}::${(s.country ?? "").toLowerCase()}`)
  );

  let added = 0;
  let skipped = 0;

  for (const q of CUSTOM_QUERIES) {
    const key = `ADZUNA::${q.toLowerCase()}::in`;
    if (seen.has(key)) { skipped++; continue; }
    await prisma.savedSearch.create({
      data: { kind: "ADZUNA", query: q, location: "Bengaluru", country: "in" },
    });
    seen.add(key);
    added++;
  }

  for (const a of ADZUNA_DEFAULT_QUERIES) {
    const key = `ADZUNA::${a.query.toLowerCase()}::${a.country.toLowerCase()}`;
    if (seen.has(key)) { skipped++; continue; }
    await prisma.savedSearch.create({
      data: { kind: "ADZUNA", query: a.query, location: a.location, country: a.country },
    });
    seen.add(key);
    added++;
  }

  for (const slug of GREENHOUSE_DEFAULT_COMPANIES) {
    const key = `GREENHOUSE::${slug.toLowerCase()}::`;
    if (seen.has(key)) { skipped++; continue; }
    await prisma.savedSearch.create({ data: { kind: "GREENHOUSE", query: slug } });
    seen.add(key);
    added++;
  }

  for (const slug of LEVER_DEFAULT_COMPANIES) {
    const key = `LEVER::${slug.toLowerCase()}::`;
    if (seen.has(key)) { skipped++; continue; }
    await prisma.savedSearch.create({ data: { kind: "LEVER", query: slug } });
    seen.add(key);
    added++;
  }

  console.log(`Done. Added ${added} · Skipped ${skipped} (already in DB)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
