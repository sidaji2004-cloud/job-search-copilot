import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/suggestions/gmail";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const err = url.searchParams.get("error");
  if (err) {
    return NextResponse.redirect(`${url.origin}/settings?gmail=error&msg=${encodeURIComponent(err)}`);
  }
  if (!code) {
    return NextResponse.redirect(`${url.origin}/settings?gmail=error&msg=no_code`);
  }
  const result = await exchangeCode(code);
  if (!result.ok) {
    return NextResponse.redirect(
      `${url.origin}/settings?gmail=error&msg=${encodeURIComponent(result.error ?? "exchange_failed")}`
    );
  }
  return NextResponse.redirect(`${url.origin}/settings?gmail=connected`);
}
