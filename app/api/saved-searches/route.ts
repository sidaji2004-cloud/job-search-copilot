import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SAVED_SEARCH_KINDS, type SavedSearchKind } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const searches = await prisma.savedSearch.findMany({
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ searches });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    kind: SavedSearchKind;
    query: string;
    location?: string | null;
    country?: string | null;
  };
  if (!SAVED_SEARCH_KINDS.includes(body.kind)) {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }
  if (!body.query?.trim()) {
    return NextResponse.json({ error: "Query required" }, { status: 400 });
  }
  const search = await prisma.savedSearch.create({
    data: {
      kind: body.kind,
      query: body.query.trim().slice(0, 120),
      location: body.location?.trim() || null,
      country: body.country?.trim().toLowerCase() || null,
    },
  });
  return NextResponse.json({ search });
}

export async function DELETE(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.savedSearch.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
