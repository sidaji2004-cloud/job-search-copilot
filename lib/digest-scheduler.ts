import { prisma } from "./db";
import { getEmailProvider } from "./email";

const SEND_HOUR = 8; // local time

/**
 * Returns true if a digest should fire right now. Policy:
 *   - An email provider is configured
 *   - Profile has digest enabled + a recipient
 *   - Current local hour >= SEND_HOUR
 *   - No DigestLog row exists for today
 *
 * Catch-up: if user missed the 8 AM window (laptop asleep), this still fires
 * the moment they next open the app after 8 AM that day.
 */
export async function shouldFireDigest(now: Date = new Date()): Promise<{
  fire: boolean;
  reason: string;
  recipient?: string;
}> {
  const provider = getEmailProvider();
  if (!provider) return { fire: false, reason: "no_provider" };

  const profile = await prisma.profile.findUnique({ where: { id: 1 } });
  if (!profile) return { fire: false, reason: "no_profile" };
  if (!profile.digestEnabled) return { fire: false, reason: "disabled" };

  const recipient = profile.digestRecipient || profile.email;
  if (!recipient) return { fire: false, reason: "no_recipient" };

  if (now.getHours() < SEND_HOUR) return { fire: false, reason: "before_window" };

  // Has a digest already fired today (local)?
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const existing = await prisma.digestLog.findFirst({
    where: { sentAt: { gte: startOfToday }, status: "OK" },
    orderBy: { sentAt: "desc" },
  });
  if (existing) return { fire: false, reason: "already_sent_today" };

  return { fire: true, reason: "ok", recipient };
}
