/**
 * Curated seed library of saved searches.
 *
 * - Adzuna queries fan out across the four target role families for a true
 *   fresher (RevOps/SalesOps, BizOps/Founder's Office, ProductOps, rotational
 *   programs) so the daily refresh surfaces a varied mix.
 * - Greenhouse / Lever slugs are pruned to companies with confirmed fresher
 *   pipelines in India (or remote-friendly fresher hiring). The post-filter
 *   in lib/filter.ts still drops senior / engineering / out-of-geo roles.
 *
 * Edit this file to add or remove defaults — the "Seed defaults" button in
 * Settings is idempotent and only inserts rows that don't already exist.
 */

export type AdzunaSeed = { query: string; location: string; country: string };

export const ADZUNA_DEFAULT_QUERIES: AdzunaSeed[] = [
  // RevOps / SalesOps family
  { query: "revenue operations analyst associate fresher", location: "Bengaluru", country: "in" },
  { query: "sales operations analyst SDR enablement", location: "Bengaluru", country: "in" },
  { query: "GTM operations go-to-market associate", location: "Bengaluru", country: "in" },
  { query: "pipeline operations analyst CRM", location: "Bengaluru", country: "in" },

  // BizOps / Founder's Office family
  { query: "business operations associate founders office", location: "Bengaluru", country: "in" },
  { query: "chief of staff associate strategy", location: "Bengaluru", country: "in" },
  { query: "strategy associate analyst fresher graduate", location: "Bengaluru", country: "in" },

  // Product Ops family
  { query: "product operations associate analyst", location: "Bengaluru", country: "in" },
  { query: "customer success operations associate", location: "Bengaluru", country: "in" },

  // Rotational / graduate programs (UG-eligible)
  { query: "management trainee graduate program rotational", location: "Bengaluru", country: "in" },
  { query: "associate program early career fresher", location: "Bengaluru", country: "in" },

  // Generic fallback — catches stragglers the filter still passes
  { query: "business analyst trainee associate graduate", location: "Bengaluru", country: "in" },
];

export const GREENHOUSE_DEFAULT_COMPANIES: string[] = [
  // Indian fintech SaaS (RevOps / BizOps heavy)
  "razorpay",
  "cred",
  "groww",
  "zerodha",
  "jupiter",
  "fi-money",

  // Indian consumer-tech (BizOps / ProductOps / Category Ops)
  "swiggy",
  "zomato",
  "meesho",
  "flipkart",
  "phonepe",
  "ola",
  "urbancompany",

  // Indian B2B SaaS (RevOps / CustomerOps)
  "postman",
  "freshworks",
  "chargebee",
  "browserstack",
  "hasura",
  "rippling",
  "atlassian",

  // Global SaaS / fintech with India ops + structured early-career pipelines.
  // NOTE: Stripe's core S&O roles need 2-3 YoE, but its Bengaluru office
  // occasionally posts fresher-eligible Operations Associate / GTM Ops /
  // User Ops roles. The post-filter hides the senior listings automatically,
  // so cost of inclusion is zero.
  "stripe",
  "notion",
  "figma",
  "linear",
  "vercel",
  "ramp",
  "brex",
  "scale",
  "anthropic",
];

export const LEVER_DEFAULT_COMPANIES: string[] = [
  // Indian SaaS / consumer brands on Lever
  "razorpayx",
  "upgrad",
  "unacademy",
  "vedantu",
  "rebelfoods",
  "porter",
  "khatabook",
  "zepto",
  "shiprocket",

  // Global brands on Lever with India ops / remote-friendly fresher hiring
  "netflix",
  "shopify",
  "canva",
  "intercom",
  "miro",
  "github",
  "loom",
];

export function totalSeedCount(): number {
  return (
    ADZUNA_DEFAULT_QUERIES.length +
    GREENHOUSE_DEFAULT_COMPANIES.length +
    LEVER_DEFAULT_COMPANIES.length
  );
}
