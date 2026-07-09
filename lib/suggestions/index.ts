import { prisma } from "../db";
import { gmailSource } from "./gmail";
import { classifyBatch } from "./classify";
import { suggestedStatusFor, type SuggestionDraft, type SuggestionSource } from "./types";

/**
 * Registered suggestion sources. Add Outlook etc. here later — the polling
 * pipeline doesn't change.
 */
const SOURCES: SuggestionSource[] = [gmailSource];

/**
 * Poll every configured source, classify new messages, match them to tracked
 * jobs, and persist as Suggestion rows. Returns count of new suggestions.
 */
export async function pollAllSources(): Promise<{ inserted: number; errors: string[] }> {
  const errors: string[] = [];
  let inserted = 0;

  for (const src of SOURCES) {
    try {
      if (!(await src.isConfigured())) continue;
      const token = await prisma.gmailToken.findUnique({ where: { id: 1 } });
      const lastPolledAt = token?.lastPolledAt ?? null;

      const raws = await src.fetchSince(lastPolledAt);
      if (raws.length === 0) continue;

      const classifications = await classifyBatch(raws);
      const classMap = new Map(classifications.map((c) => [c.externalId, c]));

      // Match each message to a tracked Job by fuzzy company-name comparison.
      const jobs = await prisma.job.findMany({
        select: { id: true, company: true },
      });
      const companyIndex = jobs.map((j) => ({
        id: j.id,
        key: normalizeCompany(j.company),
      }));

      const drafts: SuggestionDraft[] = raws.map((m) => {
        const c = classMap.get(m.externalId);
        const classification = c?.classification ?? "OTHER";
        const haystack = normalizeCompany(`${m.fromAddress} ${m.subject}`);
        const match = companyIndex.find((c) => c.key.length > 2 && haystack.includes(c.key));
        return {
          externalId: m.externalId,
          provider: src.name,
          subject: m.subject.slice(0, 300),
          fromAddress: m.fromAddress.slice(0, 200),
          receivedAt: m.receivedAt,
          classification,
          confidence: c?.confidence ?? 0,
          jobId: match?.id ?? null,
          suggestedStatus: suggestedStatusFor(classification),
        };
      });

      // Skip OTHER unless it matched a tracked job (otherwise it's noise).
      const filtered = drafts.filter((d) => d.classification !== "OTHER" || d.jobId);

      for (const d of filtered) {
        try {
          await prisma.suggestion.create({
            data: {
              externalId: d.externalId,
              provider: d.provider,
              jobId: d.jobId,
              subject: d.subject,
              fromAddress: d.fromAddress,
              classification: d.classification,
              suggestedStatus: d.suggestedStatus,
              confidence: d.confidence,
              receivedAt: d.receivedAt,
            },
          });
          inserted++;
        } catch {
          // unique constraint race — skip
        }
      }
    } catch (e) {
      errors.push(`${src.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { inserted, errors };
}

function normalizeCompany(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|pvt|private|limited|technologies|technology|labs|solutions)\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}
