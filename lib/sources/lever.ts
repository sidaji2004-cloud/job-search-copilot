import type { JobCandidate } from "./types";

/**
 * Lever public postings API. No auth required.
 * Endpoint: https://api.lever.co/v0/postings/{slug}?mode=json
 * The `slug` is the company's Lever handle (e.g. "netflix", "shopify").
 */
type LeverPosting = {
  id: string;
  text: string; // role title
  hostedUrl: string;
  categories?: { location?: string; team?: string; commitment?: string };
  descriptionPlain?: string;
  description?: string; // HTML fallback
  lists?: { text: string; content: string }[]; // requirements, responsibilities
};

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchLever(slug: string): Promise<JobCandidate[]> {
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`Lever ${res.status} for slug "${slug}"`);
  }
  const data = (await res.json()) as LeverPosting[];
  return data.map((p) => {
    const lists = (p.lists ?? [])
      .map((l) => `${l.text}\n${stripHtml(l.content)}`)
      .join("\n\n");
    const desc = (p.descriptionPlain || stripHtml(p.description ?? "")) + "\n\n" + lists;
    return {
      source: "LEVER" as const,
      externalId: p.id,
      title: p.text,
      company: slug,
      location: p.categories?.location ?? null,
      url: p.hostedUrl,
      description: desc.trim().slice(0, 16000),
    };
  });
}
