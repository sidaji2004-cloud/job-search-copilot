import type { JobCandidate } from "./types";

/**
 * Adzuna search API.
 * Docs: https://developer.adzuna.com/docs/search
 * Free tier: ~1000 calls/day.
 *
 * Required env vars: ADZUNA_APP_ID, ADZUNA_APP_KEY.
 */
type AdzunaResult = {
  id: string;
  title: string;
  description: string;
  redirect_url: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
};

type AdzunaResponse = { results?: AdzunaResult[] };

export async function fetchAdzuna({
  query,
  location,
  country = "in",
  limit = 20,
}: {
  query: string;
  location?: string | null;
  country?: string;
  limit?: number;
}): Promise<JobCandidate[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    throw new Error(
      "Adzuna keys missing. Set ADZUNA_APP_ID and ADZUNA_APP_KEY in .env.local."
    );
  }

  const url = new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/1`);
  url.searchParams.set("app_id", appId);
  url.searchParams.set("app_key", appKey);
  url.searchParams.set("results_per_page", String(limit));
  url.searchParams.set("what", query);
  // Default to Bengaluru when no location is set so we don't waste calls on
  // unrelated geos. The post-filter in lib/filter.ts is still authoritative.
  url.searchParams.set("where", location?.trim() || "Bengaluru");
  // Exclude senior/lead roles at the source where the API supports it.
  url.searchParams.set("what_exclude", "senior lead principal staff director");
  url.searchParams.set("max_days_old", "30");
  url.searchParams.set("content-type", "application/json");

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Adzuna ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as AdzunaResponse;
  return (data.results ?? []).map((r) => ({
    source: "ADZUNA" as const,
    externalId: String(r.id),
    title: r.title.replace(/<[^>]+>/g, "").trim(),
    company: r.company?.display_name ?? "Unknown",
    location: r.location?.display_name ?? null,
    url: r.redirect_url,
    description: r.description.replace(/<[^>]+>/g, "").trim().slice(0, 16000),
  }));
}

/**
 * v14 — lightweight "how many jobs match this keyword?" call for the
 * market-demand feature. Reads only Adzuna's `count` field; skips the full
 * listing parse. One call = one API credit.
 */
export async function getAdzunaCount({
  query,
  location = "Bengaluru",
  country = "in",
}: {
  query: string;
  location?: string;
  country?: string;
}): Promise<number> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    throw new Error("Adzuna keys missing. Set ADZUNA_APP_ID and ADZUNA_APP_KEY in .env.local.");
  }
  const url = new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/1`);
  url.searchParams.set("app_id", appId);
  url.searchParams.set("app_key", appKey);
  url.searchParams.set("results_per_page", "1");
  url.searchParams.set("what", query);
  url.searchParams.set("where", location);
  url.searchParams.set("max_days_old", "30");
  url.searchParams.set("content-type", "application/json");

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Adzuna ${res.status}`);
  const data = (await res.json()) as { count?: number };
  return typeof data.count === "number" ? data.count : 0;
}
