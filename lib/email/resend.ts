import type { EmailProvider, EmailMessage, EmailSendResult } from "./types";

const DEFAULT_FROM = "onboarding@resend.dev";

export const resendProvider: EmailProvider = {
  name: "resend",
  isConfigured() {
    return Boolean(process.env.RESEND_API_KEY);
  },
  async send(msg: EmailMessage): Promise<EmailSendResult> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return { ok: false, error: "RESEND_API_KEY missing" };

    const from = msg.from ?? process.env.RESEND_FROM_EMAIL ?? DEFAULT_FROM;
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [msg.to],
          subject: msg.subject,
          html: msg.html,
          text: msg.text,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        return { ok: false, error: `Resend ${res.status}: ${body.slice(0, 300)}` };
      }
      const data = (await res.json()) as { id?: string };
      return { ok: true, id: data.id ?? "unknown" };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
};
