import { prisma } from "../db";
import type { RawMessage, SuggestionSource } from "./types";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1";
const OAUTH_TOKEN = "https://oauth2.googleapis.com/token";
const OAUTH_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

function envClient() {
  return {
    clientId: process.env.GMAIL_CLIENT_ID ?? "",
    clientSecret: process.env.GMAIL_CLIENT_SECRET ?? "",
    redirectUri:
      process.env.GMAIL_REDIRECT_URI ?? "http://localhost:3000/api/gmail/callback",
  };
}

export function gmailConfigured(): boolean {
  const { clientId, clientSecret } = envClient();
  return Boolean(clientId && clientSecret);
}

/** Build the OAuth consent URL for the Connect button. */
export function buildAuthUrl(): string {
  const { clientId, redirectUri } = envClient();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent", // ensures we get a refresh_token every time
  });
  return `${OAUTH_AUTH}?${params.toString()}`;
}

/** Exchange the OAuth code for tokens; store the refresh token. */
export async function exchangeCode(code: string): Promise<{ ok: boolean; error?: string }> {
  const { clientId, clientSecret, redirectUri } = envClient();
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const res = await fetch(OAUTH_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const t = await res.text();
    return { ok: false, error: `OAuth exchange ${res.status}: ${t.slice(0, 200)}` };
  }
  const data = (await res.json()) as { refresh_token?: string };
  if (!data.refresh_token) {
    return { ok: false, error: "No refresh_token returned. Revoke app access in Google Account and retry." };
  }

  await prisma.gmailToken.upsert({
    where: { id: 1 },
    create: { id: 1, refreshToken: data.refresh_token },
    update: { refreshToken: data.refresh_token, lastPolledAt: null },
  });
  return { ok: true };
}

async function getAccessToken(refreshToken: string): Promise<string> {
  const { clientId, clientSecret } = envClient();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch(OAUTH_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OAuth refresh ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

type GmailListResponse = { messages?: { id: string }[] };
type GmailMessage = {
  id: string;
  internalDate?: string;
  snippet?: string;
  payload?: { headers?: { name: string; value: string }[] };
};

export const gmailSource: SuggestionSource = {
  name: "GMAIL",
  async isConfigured() {
    if (!gmailConfigured()) return false;
    const token = await prisma.gmailToken.findUnique({ where: { id: 1 } });
    return Boolean(token?.refreshToken);
  },
  async fetchSince(lastPolledAt: Date | null): Promise<RawMessage[]> {
    const token = await prisma.gmailToken.findUnique({ where: { id: 1 } });
    if (!token?.refreshToken) return [];
    const accessToken = await getAccessToken(token.refreshToken);

    // Query: primary category, not sent, last 7 days (covers offline gaps).
    const days = lastPolledAt
      ? Math.max(1, Math.ceil((Date.now() - lastPolledAt.getTime()) / 86400000) + 1)
      : 7;
    const q = `newer_than:${days}d -in:sent -in:chats`;

    const listRes = await fetch(
      `${GMAIL_API}/users/me/messages?q=${encodeURIComponent(q)}&maxResults=50`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!listRes.ok) {
      const t = await listRes.text();
      throw new Error(`Gmail list ${listRes.status}: ${t.slice(0, 200)}`);
    }
    const list = (await listRes.json()) as GmailListResponse;
    const ids = (list.messages ?? []).map((m) => m.id);
    if (ids.length === 0) return [];

    // Skip messages we've already turned into Suggestions.
    const seen = await prisma.suggestion.findMany({
      where: { externalId: { in: ids }, provider: "GMAIL" },
      select: { externalId: true },
    });
    const seenSet = new Set(seen.map((s) => s.externalId));
    const toFetch = ids.filter((id) => !seenSet.has(id));

    const results: RawMessage[] = [];
    for (const id of toFetch.slice(0, 25)) {
      const detailRes = await fetch(
        `${GMAIL_API}/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!detailRes.ok) continue;
      const m = (await detailRes.json()) as GmailMessage;
      const headers = new Map((m.payload?.headers ?? []).map((h) => [h.name.toLowerCase(), h.value]));
      results.push({
        externalId: m.id,
        subject: headers.get("subject") ?? "(no subject)",
        fromAddress: headers.get("from") ?? "",
        snippet: (m.snippet ?? "").slice(0, 400),
        receivedAt: m.internalDate ? new Date(Number(m.internalDate)) : new Date(),
      });
    }

    await prisma.gmailToken.update({
      where: { id: 1 },
      data: { lastPolledAt: new Date() },
    });
    return results;
  },
};
