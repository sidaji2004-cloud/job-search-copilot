import { NextResponse } from "next/server";
import { pollAllSources } from "@/lib/suggestions";

export const runtime = "nodejs";

export async function POST() {
  try {
    const result = await pollAllSources();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
