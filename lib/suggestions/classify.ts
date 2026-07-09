import { chat } from "../openrouter";
import type { Classification, RawMessage } from "./types";

type ClassifyResult = { externalId: string; classification: Classification; confidence: number };

/**
 * Bundled LLM classification — up to 5 messages per call to amortise cost.
 * Returns one result per input in the same order; falls back to OTHER@0
 * on any parse error so the caller never crashes.
 */
export async function classifyBatch(messages: RawMessage[]): Promise<ClassifyResult[]> {
  if (messages.length === 0) return [];

  const system = `You classify recruiting emails. For each email, output a JSON object with classification + confidence (0-1). Output ONLY a JSON array with one object per email in input order — no prose, no backticks.
Classifications:
- INTERVIEW_INVITE: invites the candidate to schedule or attend an interview, or asks for availability for one.
- REJECTION: informs candidate they were not selected / position filled / pursuing other candidates.
- OFFER: extends a job offer.
- CONFIRMATION: acknowledges receipt of application, says "received", "thanks for applying", etc.
- OTHER: anything else (recruiter cold outreach, newsletters, marketing).`;

  const user =
    "Classify each of these emails:\n\n" +
    messages
      .map(
        (m, i) =>
          `[${i}]\nFrom: ${m.fromAddress}\nSubject: ${m.subject}\nSnippet: ${m.snippet}`
      )
      .join("\n\n") +
    `\n\nReturn JSON array of length ${messages.length}: [{"classification":"...","confidence":0.0}, ...]`;

  try {
    const { content } = await chat({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.1,
      maxTokens: 400,
    });
    const m = content.match(/\[[\s\S]*\]/);
    if (!m) throw new Error("no JSON array");
    const parsed = JSON.parse(m[0]) as { classification?: string; confidence?: number }[];
    return messages.map((msg, i) => {
      const p = parsed[i];
      return {
        externalId: msg.externalId,
        classification: normalize(p?.classification),
        confidence: typeof p?.confidence === "number" ? clamp01(p.confidence) : 0.5,
      };
    });
  } catch {
    return messages.map((m) => ({
      externalId: m.externalId,
      classification: "OTHER",
      confidence: 0,
    }));
  }
}

function normalize(s: string | undefined): Classification {
  const u = (s ?? "").toUpperCase();
  if (u === "INTERVIEW_INVITE" || u === "REJECTION" || u === "OFFER" || u === "CONFIRMATION") {
    return u;
  }
  return "OTHER";
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}
