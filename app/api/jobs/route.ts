import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { scrapeJobUrl } from "@/lib/scrape";
import { chat } from "@/lib/openrouter";
import { STATUSES, type Status } from "@/lib/types";
import { buildFitScorePrompt } from "@/lib/prompts";

export const runtime = "nodejs";

export async function GET() {
  const jobs = await prisma.job.findMany({
    orderBy: [{ status: "asc" }, { position: "asc" }],
  });

  // Join company ratings & compute opportunity score in one pass.
  const keys = Array.from(
    new Set(jobs.map((j) => j.company.trim().toLowerCase()).filter(Boolean))
  );
  const ratings = await prisma.companyRating.findMany({
    where: { companyKey: { in: keys } },
  });
  const ratingByKey = new Map(ratings.map((r) => [r.companyKey, r]));

  const enriched = jobs.map((j) => {
    const key = j.company.trim().toLowerCase();
    const r = ratingByKey.get(key);
    const prestige = r?.prestige ?? 5;
    const reputation = r?.reputation ?? 5;
    const fit = j.fitScore ?? 50;
    const learn = j.learningPotential ?? 5;
    const opportunityScore = Math.round(
      fit * 0.5 + prestige * 10 * 0.2 + learn * 10 * 0.2 + reputation * 10 * 0.1
    );
    return {
      ...j,
      companyPrestige: r?.prestige ?? null,
      companyReputation: r?.reputation ?? null,
      opportunityScore,
    };
  });

  return NextResponse.json({ jobs: enriched });
}

type CreateBody = {
  url?: string;
  text?: string;
  title?: string;
  company?: string;
};

async function extractMeta(content: string, hintUrl?: string) {
  const sys = `Extract metadata from the provided job posting text. Output ONLY a JSON object with keys: title (string), company (string), location (string or null), summary (string, 1-2 sentences). If you cannot determine a field, use an empty string for strings or null for location. Do not include backticks or any prose around the JSON.`;
  const user = `${hintUrl ? `Source URL: ${hintUrl}\n\n` : ""}Job posting text:\n${content.slice(0, 8000)}`;
  try {
    const { content: out } = await chat({
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      temperature: 0.1,
      maxTokens: 400,
    });
    const jsonMatch = out.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]) as {
      title: string;
      company: string;
      location: string | null;
      summary: string;
    };
  } catch (e) {
    console.error("extractMeta failed:", e);
    return null;
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as CreateBody;
  let description = (body.text ?? "").trim();
  const url: string | null = body.url?.trim() || null;
  let title = body.title?.trim() || "";
  let company = body.company?.trim() || "";
  let location: string | null = null;

  if (url && !description) {
    try {
      const scraped = await scrapeJobUrl(url);
      description = scraped.rawText;
      title ||= scraped.title ?? "";
      company ||= scraped.company ?? "";
      location = scraped.location ?? null;
    } catch (e) {
      return NextResponse.json(
        {
          error: `Could not fetch the URL. Some sites (LinkedIn) block scraping — paste the job description text instead.`,
          detail: e instanceof Error ? e.message : String(e),
        },
        { status: 400 }
      );
    }
  }

  if (!description) {
    return NextResponse.json(
      { error: "Provide either a job URL or pasted job description text." },
      { status: 400 }
    );
  }

  // Always try AI-extract to fill missing fields, even when URL was scraped.
  if (!title || !company) {
    const meta = await extractMeta(description, url ?? undefined);
    if (meta) {
      title ||= meta.title;
      company ||= meta.company;
      location ||= meta.location;
    }
  }

  title ||= "Untitled role";
  company ||= "Unknown company";

  const maxPos = await prisma.job.aggregate({
    where: { status: "WISHLIST" },
    _max: { position: true },
  });
  const position = (maxPos._max.position ?? 0) + 1;

  // Compute fit score before creating the job
  let fitScore: number | null = null;
  let fitReason: string | null = null;
  try {
    const profile = await prisma.profile.findUnique({ where: { id: 1 } });
    if (profile?.resumeText) {
      const scorePrompt = buildFitScorePrompt({
        fullName: profile.fullName,
        resumeText: profile.resumeText,
        jobTitle: title,
        company,
        jobDescription: description.slice(0, 6000),
      });
      const { content } = await chat({
        messages: [
          { role: "system", content: scorePrompt.system },
          { role: "user", content: scorePrompt.user },
        ],
        temperature: 0.1,
        maxTokens: 120,
      });
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]) as { score: number; reason: string };
        fitScore = Math.min(100, Math.max(0, Math.round(parsed.score)));
        fitReason = parsed.reason?.slice(0, 300) ?? null;
      }
    }
  } catch {
    // fit score is best-effort — never block job creation
  }

  const job = await prisma.job.create({
    data: {
      title: title.slice(0, 200),
      company: company.slice(0, 120),
      location: location?.slice(0, 120) ?? null,
      url,
      description: description.slice(0, 20000),
      status: "WISHLIST",
      position,
      fitScore,
      fitReason,
    },
  });
  return NextResponse.json({ job });
}

export async function PUT(req: NextRequest) {
  // Bulk re-position after drag — body: { updates: [{id, status, position}] }
  const { updates } = (await req.json()) as {
    updates: { id: string; status: Status; position: number }[];
  };
  for (const u of updates) {
    if (!STATUSES.includes(u.status)) continue;
    await prisma.job.update({
      where: { id: u.id },
      data: { status: u.status, position: u.position },
    });
  }
  return NextResponse.json({ ok: true });
}
