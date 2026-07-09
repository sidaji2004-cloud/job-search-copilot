import { resendProvider } from "./resend";
import type { EmailProvider } from "./types";

/**
 * Picks the first configured email provider. Returns null if none configured —
 * callers must handle that case gracefully (the app still works without email).
 *
 * To add a new provider (e.g. Gmail SMTP, Postmark):
 *   1. Implement EmailProvider in lib/email/<name>.ts
 *   2. Add it to the chain below in priority order
 */
const PROVIDERS: EmailProvider[] = [resendProvider];

export function getEmailProvider(): EmailProvider | null {
  for (const p of PROVIDERS) {
    if (p.isConfigured()) return p;
  }
  return null;
}

export type { EmailProvider, EmailMessage, EmailSendResult } from "./types";
