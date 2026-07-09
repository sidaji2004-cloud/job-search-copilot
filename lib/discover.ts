import { prisma } from "./db";
import { chat } from "./openrouter";
import { buildJobAnalysisPrompt, buildCompanyRatingPrompt } from "./prompts";
import { fetchAdzuna } from "./sources/adzuna";
import { fetchGreenhouse } from "./sources/greenhouse";
import { fetchLever } from "./sources/lever";
import { passesTargetFilter, passesLegitimacyHeuristic } from "./filter";
import type { JobCandidate } from "./sources/types";

export type DiscoverReport = {
  fetched: number;
  inserted: number;
  skipped: number;
  filtered: number;
  errors: { source: string; query: string; message: string }[];
  durationMs: number;
};

/**
 * Run all configured saved searches, score new jobs, and drop them into the INBOX column.
 * Idempotent — a job already imported (matched by source + externalId) is skipped.
 */
export async function runDiscovery(): Promise<DiscoverReport> {
  const started = Date.now();
  const report: DiscoverReport = {
    fetched: 0,
    inserted: 0,
    skipped: 0,
    filtered: 0,
    errors: [],
    durationMs: 0,
  };

  const [searches, profile] = await Promise.all([
    prisma.savedSearch.findMany(),
    prisma.profile.findUnique({ where: { id: 1 } }),
  ]);

  if (searches.length === 0) {
    report.durationMs = Date.now() - started;
    return report;
  }

  const allCandidates: JobCandidate[] = [];

  for (const s of searches) {
    try {
      let candidates: JobCandidate[] = [];
      if (s.kind === "ADZUNA") {
        candidates = await fetchAdzuna({
          query: s.query,
          location: s.location,
          country: s.country ?? "in",
        });
      } else if (s.kind === "GREENHOUSE") {
        candidates = await fetchGreenhouse(s.query);
      } else if (s.kind === "LEVER") {
        candidates = await fetchLever(s.query);
      }
      report.fetched += candidates.length;
      // Apply target filter (entry-level business in Bengaluru / remote) AND
      // legitimacy heuristic (drops obvious scams). Both are pure string matching.
      const kept: JobCandidate[] = [];
      for (const c of candidates) {
        if (!passesTargetFilter(c).ok) {
          report.filtered++;
          continue;
        }
        if (!passesLegitimacyHeuristic(c).ok) {
          report.filtered++;
          continue;
        }
        kept.push(c);
      }
      allCandidates.push(...kept);
      await prisma.savedSearch.update({
        where: { id: s.id },
        data: { lastFetchedAt: new Date() },
      });
    } catch (e) {
      report.errors.push({
        source: s.kind,
        query: s.query,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // Dedupe within this batch by (source, externalId)
  const seen = new Set<string>();
  const unique = allCandidates.filter((c) => {
    const k = `${c.source}:${c.externalId}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // Check which already exist in DB
  const existing = await prisma.job.findMany({
    where: {
      OR: unique.map((c) => ({ source: c.source, externalId: c.externalId })),
    },
    select: { source: true, externalId: true },
  });
  const existingKeys = new Set(existing.map((e) => `${e.source}:${e.externalId}`));
  const fresh = unique.filter((c) => !existingKeys.has(`${c.source}:${c.externalId}`));
  report.skipped = unique.length - fresh.length;

  // Score and insert
  let position = await nextInboxPosition();
  const companyRatingCache = new Map<string, boolean>(); // key -> has-row
  for (const cand of fresh) {
    let fitScore: number | null = null;
    let fitReason: string | null = null;
    let summary: string | null = null;
    let experienceReq: string | null = null;
    let learningPotential: number | null = null;
    let legitimacyScore: number | null = null;
    let redFlags: string | null = null;
    let dropForLegitimacy = false;

    if (profile?.resumeText) {
      try {
        const p = buildJobAnalysisPrompt({
          fullName: profile.fullName,
          resumeText: profile.resumeText,
          jobTitle: cand.title,
          company: cand.company,
          jobDescription: cand.description.slice(0, 6000),
        });
        const { content } = await chat({
          messages: [
            { role: "system", content: p.system },
            { role: "user", content: p.user },
          ],
          temperature: 0.1,
          maxTokens: 400,
        });
        const m = content.match(/\{[\s\S]*\}/);
        if (m) {
          const parsed = JSON.parse(m[0]) as {
            fitScore?: number;
            fitReason?: string;
            summary?: string;
            experienceReq?: string;
            learningPotential?: number;
            tooExperienced?: boolean;
            legitimacyScore?: number;
            redFlags?: string;
          };
          // Skip roles the AI identifies as requiring 2+ years — catches cases
          // the keyword filter missed (e.g. "minimum two years").
          if (parsed.tooExperienced === true) {
            report.filtered++;
            continue;
          }
          // v10 legitimacy gate — drop clear scams the heuristic missed.
          if (typeof parsed.legitimacyScore === "number" && parsed.legitimacyScore < 40) {
            dropForLegitimacy = true;
          }
          if (typeof parsed.fitScore === "number") {
            fitScore = Math.min(100, Math.max(0, Math.round(parsed.fitScore)));
          }
          fitReason = parsed.fitReason?.slice(0, 300) ?? null;
          summary = parsed.summary?.slice(0, 500) ?? null;
          experienceReq = parsed.experienceReq?.slice(0, 60) ?? null;
          if (typeof parsed.learningPotential === "number") {
            learningPotential = Math.min(10, Math.max(0, Math.round(parsed.learningPotential)));
          }
          if (typeof parsed.legitimacyScore === "number") {
            legitimacyScore = Math.min(100, Math.max(0, Math.round(parsed.legitimacyScore)));
          }
          redFlags = parsed.redFlags?.slice(0, 200) ?? null;
        }
      } catch {
        // best-effort — keep going even if scoring fails
      }
    }

    // Apply legitimacy gate AFTER the parse so we never insert clear scams.
    if (dropForLegitimacy) {
      report.filtered++;
      continue;
    }

    // Ensure a CompanyRating exists for this company (one LLM call per unique new company).
    const companyKey = cand.company.trim().toLowerCase().slice(0, 120);
    if (companyKey && !companyRatingCache.has(companyKey)) {
      const existingRating = await prisma.companyRating.findUnique({ where: { companyKey } });
      if (!existingRating) {
        try {
          const p = buildCompanyRatingPrompt(cand.company);
          const { content } = await chat({
            messages: [
              { role: "system", content: p.system },
              { role: "user", content: p.user },
            ],
            temperature: 0.1,
            maxTokens: 150,
          });
          const m = content.match(/\{[\s\S]*\}/);
          if (m) {
            const parsed = JSON.parse(m[0]) as {
              prestige?: number;
              reputation?: number;
              notes?: string;
            };
            await prisma.companyRating.create({
              data: {
                companyKey,
                prestige: clamp10(parsed.prestige ?? 5),
                reputation: clamp10(parsed.reputation ?? 5),
                notes: parsed.notes?.slice(0, 200) ?? null,
              },
            });
          } else {
            await prisma.companyRating.create({
              data: { companyKey, prestige: 5, reputation: 5, notes: "unknown" },
            });
          }
        } catch {
          // best-effort
        }
      }
      companyRatingCache.set(companyKey, true);
    }

    try {
      await prisma.job.create({
        data: {
          title: cand.title.slice(0, 200),
          company: cand.company.slice(0, 120),
          location: cand.location?.slice(0, 120) ?? null,
          url: cand.url,
          description: cand.description.slice(0, 20000),
          status: "INBOX",
          position: position++,
          source: cand.source,
          externalId: cand.externalId,
          fitScore,
          fitReason,
          summary,
          experienceReq,
          learningPotential,
          legitimacyScore,
          redFlags,
        },
      });
      report.inserted++;
    } catch {
      // unique constraint race — skip
      report.skipped++;
    }
  }

  report.durationMs = Date.now() - started;
  return report;
}

function clamp10(n: number): number {
  return Math.min(10, Math.max(0, Math.round(n)));
}

async function nextInboxPosition(): Promise<number> {
  const r = await prisma.job.aggregate({
    where: { status: "INBOX" },
    _max: { position: true },
  });
  return (r._max.position ?? 0) + 1;
}
