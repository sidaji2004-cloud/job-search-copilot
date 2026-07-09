import type { Source } from "@/lib/types";

/**
 * Normalized job from any external source — the shape lib/discover.ts expects.
 * Every source adapter returns these.
 */
export type JobCandidate = {
  source: Source; // ADZUNA | GREENHOUSE | LEVER | BOOKMARKLET
  externalId: string; // stable id from the source — used for deduplication
  title: string;
  company: string;
  location: string | null;
  url: string | null;
  description: string; // markdown / plain text, max ~16k chars
};
