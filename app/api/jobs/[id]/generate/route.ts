import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { chat } from "@/lib/openrouter";
import { buildPrompt } from "@/lib/prompts";
import { KINDS, type Kind } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { kind, model } = (await req.json()) as { kind: Kind; model?: string };
  if (!KINDS.includes(kind)) {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  const [job, profile] = await Promise.all([
    prisma.job.findUnique({ where: { id } }),
    prisma.profile.findUnique({ where: { id: 1 } }),
  ]);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const prompt = buildPrompt(kind, {
    fullName: profile?.fullName ?? "the candidate",
    resumeText: profile?.resumeText ?? "",
    jobTitle: job.title,
    company: job.company,
    jobDescription: job.description,
  });

  let result;
  try {
    result = await chat({
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
      model,
      temperature: 0.55,
      maxTokens: 1800,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Generation failed" },
      { status: 500 }
    );
  }

  const generation = await prisma.generation.upsert({
    where: { jobId_kind: { jobId: id, kind } },
    update: { content: result.content, model: result.model },
    create: { jobId: id, kind, content: result.content, model: result.model },
  });

  return NextResponse.json({ generation });
}
