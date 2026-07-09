import type { JobCandidate } from "./types";

/**
 * Greenhouse public job board API. No auth required.
 * Endpoint: https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true
 * The `slug` is the company's Greenhouse handle (e.g. "stripe", "airbnb").
 */
type GhJob = {
  id: number;
  title: string;
  absolute_url: string;
  location?: { name?: string };
  content?: string; // HTML
  company_name?: string;
};

type GhResponse = { jobs?: GhJob[]; meta?: { total?: number } };

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchGreenhouse(slug: string): Promise<JobCandidate[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs?content=true`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`Greenhouse ${res.status} for slug "${slug}"`);
  }
  const data = (await res.json()) as GhResponse;
  return (data.jobs ?? []).map((j) => ({
    source: "GREENHOUSE" as const,
    externalId: String(j.id),
    title: j.title,
    company: j.company_name ?? slug,
    location: j.location?.name ?? null,
    url: j.absolute_url,
    description: stripHtml(j.content ?? "").slice(0, 16000),
  }));
}
