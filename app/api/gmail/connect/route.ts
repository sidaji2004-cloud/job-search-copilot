import { NextResponse } from "next/server";
import { buildAuthUrl, gmailConfigured } from "@/lib/suggestions/gmail";

export const runtime = "nodejs";

export async function GET() {
  if (!gmailConfigured()) {
    return NextResponse.json(
      { error: "GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET missing in .env.local" },
      { status: 400 }
    );
  }
  return NextResponse.redirect(buildAuthUrl());
}
