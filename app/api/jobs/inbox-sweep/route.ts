import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { passesTargetFilter, passesLegitimacyHeuristic } from "@/lib/filter";
import { buildJobAnalysisPrompt } from "@/lib/prompts";
import { chat } from "@/lib/openrouter";
import type { JobCandidate } from "@/lib/sources/types";

export const runtime = "nodejs";

type SweepResult = {
  scanned: number;
  keywordDropped: number;
  llmDropped: {
    tooExperienced: number;
    scam: number;
    misaligned: number;
  };
  kept: number;
  errors: number;
  durationMs: number;
};

/**
 * POST /api/jobs/inbox-sweep
 *
 * Re-evaluates every job in the INBOX column against the current filter rules
 * and drops anything that:
 *   - fails the keyword ICP filter (too experienced / wrong function / wrong geo)
 *   - matches a scam heuristic
 *   - the LLM flags as tooExperienced
 *   - has legitimacyScore < 40
 *   - has fitScore < 30 AND learningPotential < 4 (misaligned with no upside)
 *
 * Jobs that survive get their scores written back so the sweep is idempotent.
 * Manual button trigger only — never auto-fires.
 */
export async function POST() {
  const started = Date.now();
  const result: SweepResult = {
    scanned: 0,
    keywordDropped: 0,
    llmDropped: { tooExperienced: 0, scam: 0, misaligned: 0 },
    kept: 0,
    errors: 0,
    durationMs: 0,
  };

  const [jobs, profile] = await Promise.all([
    prisma.job.findMany({
      where: { status: "INBOX" },
      select: {
        id: true,
        title: true,
        company: true,
        location: true,
        description: true,
        source: true,
        externalId: true,
      },
    }),
    prisma.profile.findUnique({ where: { id: 1 } }),
  ]);

  result.scanned = jobs.length;

  for (const job of jobs) {
    const candidate: JobCandidate = {
      title: job.title,
      company: job.company,
      location: job.location,
      description: job.description,
      url: null,
      source: (job.source as JobCandidate["source"]) ?? "MANUAL",
      externalId: job.externalId ?? job.id,
    };

    // Pass 1 — free keyword checks against stored row text.
    if (!passesTargetFilter(candidate).ok || !passesLegitimacyHeuristic(candidate).ok) {
      await prisma.job.delete({ where: { id: job.id } });
      result.keywordDropped++;
      continue;
    }

    // Pass 2 — bundled LLM analysis (same prompt as discovery).
    if (!profile?.resumeText) {
      result.kept++;
      continue;
    }

    try {
      const p = buildJobAnalysisPrompt({
        fullName: profile.fullName,
        resumeText: profile.resumeText,
        jobTitle: job.title,
        company: job.company,
        jobDescription: job.description.slice(0, 6000),
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
      if (!m) {
        result.kept++;
        continue;
      }
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

      // Drop categories — same gates as discovery, plus the misaligned dual-gate.
      if (parsed.tooExperienced === true) {
        await prisma.job.delete({ where: { id: job.id } });
        result.llmDropped.tooExperienced++;
        continue;
      }
      if (typeof parsed.legitimacyScore === "number" && parsed.legitimacyScore < 40) {
        await prisma.job.delete({ where: { id: job.id } });
        result.llmDropped.scam++;
        continue;
      }
      const fit =
        typeof parsed.fitScore === "number"
          ? Math.min(100, Math.max(0, Math.round(parsed.fitScore)))
          : null;
      const learn =
        typeof parsed.learningPotential === "number"
          ? Math.min(10, Math.max(0, Math.round(parsed.learningPotential)))
          : null;
      if (fit !== null && fit < 30 && learn !== null && learn < 4) {
        await prisma.job.delete({ where: { id: job.id } });
        result.llmDropped.misaligned++;
        continue;
      }

      // Survivor — write scores back so re-running the sweep is cheap.
      await prisma.job.update({
        where: { id: job.id },
        data: {
          fitScore: fit,
          fitReason: parsed.fitReason?.slice(0, 300) ?? null,
          summary: parsed.summary?.slice(0, 500) ?? null,
          experienceReq: parsed.experienceReq?.slice(0, 60) ?? null,
          learningPotential: learn,
          legitimacyScore:
            typeof parsed.legitimacyScore === "number"
              ? Math.min(100, Math.max(0, Math.round(parsed.legitimacyScore)))
              : null,
          redFlags: parsed.redFlags?.slice(0, 200) ?? null,
        },
      });
      result.kept++;
    } catch {
      result.errors++;
      result.kept++; // on LLM error, leave the row alone — don't accidentally delete.
    }
  }

  result.durationMs = Date.now() - started;
  return NextResponse.json(result);
}
