import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEmailProvider } from "@/lib/email";
import { buildDigest } from "@/lib/digest";
import { shouldFireDigest } from "@/lib/digest-scheduler";

export const runtime = "nodejs";

/**
 * POST /api/digest
 *   body: { force?: boolean, recipient?: string }
 *   - force=true → bypass schedule check (used by Settings "Send digest now")
 *   - recipient → override the configured recipient (used for testing)
 *   - default → only fire when shouldFireDigest() returns true
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    force?: boolean;
    recipient?: string;
  };

  const provider = getEmailProvider();
  if (!provider) {
    return NextResponse.json(
      { ok: false, error: "No email provider configured. Set RESEND_API_KEY in .env.local." },
      { status: 400 }
    );
  }

  let recipient = body.recipient ?? "";
  if (!body.force) {
    const check = await shouldFireDigest();
    if (!check.fire) {
      return NextResponse.json({ ok: false, skipped: true, reason: check.reason });
    }
    recipient = check.recipient ?? recipient;
  } else if (!recipient) {
    const profile = await prisma.profile.findUnique({ where: { id: 1 } });
    recipient = profile?.digestRecipient || profile?.email || "";
  }

  if (!recipient) {
    return NextResponse.json(
      { ok: false, error: "No recipient. Set Profile.email or digestRecipient." },
      { status: 400 }
    );
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const { subject, html, text, jobs } = await buildDigest({ since });

  const result = await provider.send({ to: recipient, subject, html, text });

  await prisma.digestLog.create({
    data: {
      jobCount: jobs.length,
      recipient,
      status: result.ok ? (jobs.length === 0 ? "SKIPPED_EMPTY" : "OK") : "ERROR",
      errorMsg: result.ok ? null : result.error,
    },
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true, jobCount: jobs.length, recipient, messageId: result.id });
}

/** GET /api/digest — returns the most recent DigestLog row + provider status. */
export async function GET() {
  const provider = getEmailProvider();
  const last = await prisma.digestLog.findFirst({ orderBy: { sentAt: "desc" } });
  return NextResponse.json({
    providerName: provider?.name ?? null,
    providerConfigured: Boolean(provider),
    last,
  });
}
