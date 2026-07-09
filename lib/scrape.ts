import * as cheerio from "cheerio";

export type ScrapedJob = {
  rawText: string;
  title?: string;
  company?: string;
  location?: string;
};

/**
 * Fetch a job posting page and extract its visible text. Best-effort —
 * sites like LinkedIn block scraping; the caller should fall back to "paste text".
 */
export async function scrapeJobUrl(url: string): Promise<ScrapedJob> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Failed to fetch URL: HTTP ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);

  $("script, style, noscript, svg, header nav, footer").remove();

  const title = $("h1").first().text().trim() || $("title").text().trim();
  const ogSite = $('meta[property="og:site_name"]').attr("content")?.trim();

  // Pull JSON-LD JobPosting if present (Greenhouse, Lever, etc. expose this)
  let jsonLdJob: Record<string, unknown> | null = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const parsed = JSON.parse($(el).contents().text());
      const blob = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of blob) {
        if (item && typeof item === "object" && item["@type"] === "JobPosting") {
          jsonLdJob = item as Record<string, unknown>;
          return false;
        }
      }
    } catch {
      /* ignore malformed ld+json */
    }
  });

  const main = $("main").text() || $("article").text() || $("body").text();
  const rawText = main.replace(/\s+/g, " ").trim().slice(0, 16000);

  const ld = jsonLdJob as Record<string, unknown> | null;
  const ldCompany = (() => {
    const org = ld?.hiringOrganization as { name?: string } | undefined;
    return typeof org?.name === "string" ? org.name : undefined;
  })();
  const ldLocation = (() => {
    const loc = ld?.jobLocation as { address?: { addressLocality?: string } } | undefined;
    return loc?.address?.addressLocality;
  })();

  return {
    rawText,
    title: (ld?.title as string | undefined) ?? title,
    company: ldCompany ?? ogSite,
    location: ldLocation,
  };
}
