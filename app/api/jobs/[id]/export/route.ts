import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { toDocx, toPdf } from "@/lib/export";
import { KINDS, KIND_LABEL, type Kind } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") as Kind | null;
  const format = (url.searchParams.get("format") || "docx").toLowerCase();
  if (!kind || !KINDS.includes(kind)) {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }
  if (format !== "docx" && format !== "pdf") {
    return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  }

  const [job, gen] = await Promise.all([
    prisma.job.findUnique({ where: { id } }),
    prisma.generation.findUnique({ where: { jobId_kind: { jobId: id, kind } } }),
  ]);
  if (!job || !gen) {
    return NextResponse.json({ error: "No generation yet — generate first." }, { status: 404 });
  }

  const safeSlug = `${job.company}-${KIND_LABEL[kind]}`
    .replace(/[^a-z0-9-]+/gi, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
  const filename = `${safeSlug}.${format}`;
  const title = `${KIND_LABEL[kind]} — ${job.title} at ${job.company}`;

  const buf =
    format === "docx" ? await toDocx(gen.content, title) : await toPdf(gen.content, title);

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type":
        format === "docx"
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
