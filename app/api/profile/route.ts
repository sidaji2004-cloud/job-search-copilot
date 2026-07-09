import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const profile = await prisma.profile.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  const hasOpenrouter = Boolean(process.env.OPENROUTER_API_KEY);
  const defaultModel = process.env.OPENROUTER_DEFAULT_MODEL || "anthropic/claude-sonnet-4.5";
  return NextResponse.json({ profile, hasOpenrouter, defaultModel });
}

export async function PATCH(req: NextRequest) {
  const body = (await req.json()) as Partial<{
    fullName: string;
    email: string;
    resumeText: string;
    digestRecipient: string | null;
    digestEnabled: boolean;
  }>;
  const profile = await prisma.profile.upsert({
    where: { id: 1 },
    update: body,
    create: { id: 1, ...body },
  });
  return NextResponse.json({ profile });
}

/**
 * PDF resume upload — extracts text via pdf-parse and overwrites Profile.resumeText.
 * Accepts multipart/form-data with a "file" field.
 */
export async function PUT(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Please upload a PDF." }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const pdfParseMod = (await import("pdf-parse")) as unknown as {
    default?: (b: Buffer) => Promise<{ text: string }>;
  };
  const pdfParse = pdfParseMod.default ?? (pdfParseMod as unknown as (b: Buffer) => Promise<{ text: string }>);
  const out = await pdfParse(buf);
  const resumeText = out.text.trim();
  if (resumeText.length < 50) {
    return NextResponse.json(
      { error: "Could not extract text from this PDF (it may be image-only)." },
      { status: 400 }
    );
  }
  const profile = await prisma.profile.upsert({
    where: { id: 1 },
    update: { resumeText },
    create: { id: 1, resumeText },
  });
  return NextResponse.json({ profile, chars: resumeText.length });
}
