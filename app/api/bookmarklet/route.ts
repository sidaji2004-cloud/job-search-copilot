import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { chat } from "@/lib/openrouter";
import { buildFitScorePrompt } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = { url?: string; text?: string };

async function extractMeta(content: string, hintUrl?: string) {
  const sys = `Extract metadata from the provided job posting text. Output ONLY a JSON object with keys: title (string), company (string), location (string or null). If you cannot determine a field, use an empty string for strings or null for location. Do not include backticks or any prose around the JSON.`;
  const user = `${hintUrl ? `Source URL: ${hintUrl}\n\n` : ""}Job posting text:\n${content.slice(0, 8000)}`;
  try {
    const { content: out } = await chat({
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      temperature: 0.1,
      maxTokens: 200,
    });
    const m = out.match(/\{[\s\S]*\}/);
    if (!m) return null;
    return JSON.parse(m[0]) as {
      title: string;
      company: string;
      location: string | null;
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const { url, text } = (await req.json()) as Body;
  const description = (text ?? "").trim();
  if (!description || description.length < 50) {
    return NextResponse.json(
      { error: "Page text too short — likely not a job posting." },
      { status: 400 }
    );
  }

  // Dedupe by URL when provided
  if (url) {
    const existing = await prisma.job.findFirst({ where: { url } });
    if (existing) {
      return NextResponse.json({ job: existing, duplicate: true });
    }
  }

  // Use AI to pull out title/company/location
  const meta = await extractMeta(description, url ?? undefined);
  const title = (meta?.title || "Untitled role").slice(0, 200);
  const company = (meta?.company || "Unknown").slice(0, 120);
  const location = meta?.location?.slice(0, 120) ?? null;

  // Fit score
  let fitScore: number | null = null;
  let fitReason: string | null = null;
  const profile = await prisma.profile.findUnique({ where: { id: 1 } });
  if (profile?.resumeText) {
    try {
      const p = buildFitScorePrompt({
        fullName: profile.fullName,
        resumeText: profile.resumeText,
        jobTitle: title,
        company,
        jobDescription: description.slice(0, 6000),
      });
      const { content } = await chat({
        messages: [
          { role: "system", content: p.system },
          { role: "user", content: p.user },
        ],
        temperature: 0.1,
        maxTokens: 120,
      });
      const m = content.match(/\{[\s\S]*\}/);
      if (m) {
        const parsed = JSON.parse(m[0]) as { score: number; reason: string };
        fitScore = Math.min(100, Math.max(0, Math.round(parsed.score)));
        fitReason = parsed.reason?.slice(0, 300) ?? null;
      }
    } catch {
      // ignore
    }
  }

  const maxPos = await prisma.job.aggregate({
    where: { status: "INBOX" },
    _max: { position: true },
  });
  const position = (maxPos._max.position ?? 0) + 1;

  const job = await prisma.job.create({
    data: {
      title,
      company,
      location,
      url: url ?? null,
      description: description.slice(0, 20000),
      status: "INBOX",
      position,
      source: "BOOKMARKLET",
      fitScore,
      fitReason,
    },
  });
  return NextResponse.json({ job });
}
