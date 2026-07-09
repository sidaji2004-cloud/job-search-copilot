import { NextResponse } from "next/server";
import { runDiscovery } from "@/lib/discover";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST() {
  try {
    const report = await runDiscovery();
    return NextResponse.json({ ok: true, report });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
