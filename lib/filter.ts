import type { JobCandidate } from "./sources/types";

/**
 * Target filter for Sidharth's job search:
 *   Entry-level / graduate business roles in Bengaluru OR fully remote.
 *
 * Pure string matching — no API calls, no AI, runs in <1ms per candidate.
 * Tweak the arrays below to adjust what gets through; do NOT touch the logic.
 */

const ENTRY_LEVEL = [
  "entry level",
  "entry-level",
  "graduate",
  "junior",
  "jr.",
  "jr ",
  "associate",
  "intern",
  "internship",
  "trainee",
  "fresher",
  "0-1 year",
  "0-2 year",
  "0 - 1 year",
  "0 - 2 year",
  "new grad",
  "early career",
  "early-career",
  "analyst i",
  "apprentice",
  "rotational",
];

const BUSINESS = [
  "business",
  "marketing",
  "sales",
  "operations",
  " ops ",
  "finance",
  "consulting",
  "consultant",
  "strategy",
  "product",
  "bd ",
  " bd,",
  "business development",
  "account",
  "customer success",
  "program manager",
  "project manager",
  "analyst",
  "commercial",
  "go-to-market",
  "gtm",
  "partnerships",
  "growth",
  "recruiting",
  "people ops",
  "hr ",
  "human resources",
  "talent",
  "operations associate",
];

// Senior / over-experienced signals — any one of these kills the candidate.
const SENIOR_TITLE = [
  "senior",
  "sr.",
  "sr ",
  "staff ",
  "principal",
  " lead ",
  "lead,",
  "manager ii",
  "head of",
  "director",
  "vp ",
  "vice president",
  "chief",
  " ii ",
  " iii ",
  " iv ",
  "experienced",
  "5+ years",
  "7+ years",
  "10+ years",
];

// Experience phrases that indicate 2+ years required — reject these.
const TOO_EXPERIENCED = [
  "2+ years",
  "2 + years",
  "2-3 years",
  "2 - 3 years",
  "3+ years",
  "3 years",
  "4+ years",
  "5+ years",
  "minimum 2 years",
  "at least 2 years",
  "minimum of 2 years",
  "at least 2",
  "2 years of experience",
  "three years",
  "four years",
  "five years",
  "2 years experience",
  "3 years experience",
];

// Tech roles to exclude regardless of "entry level" wording.
const TECH_HEAVY = [
  "software engineer",
  " sde",
  " swe",
  "developer",
  "devops",
  "sre ",
  "site reliability",
  "ml engineer",
  "machine learning engineer",
  "data engineer",
  "data scientist",
  "backend",
  "back-end",
  "frontend",
  "front-end",
  "full stack",
  "fullstack",
  "ios engineer",
  "android engineer",
  "mobile engineer",
  "qa engineer",
  "test engineer",
  "security engineer",
  "infrastructure engineer",
  "platform engineer",
  "embedded",
  "firmware",
];

const BENGALURU = ["bengaluru", "bangalore", "blr", "karnataka"];

// Other Indian cities — if the location field contains any of these and the role
// isn't remote, reject it. Prevents Mumbai / Delhi / Hyderabad jobs from passing
// when their description happens to mention Bengaluru.
const OTHER_INDIA_CITIES = [
  "mumbai", "delhi", "new delhi", "hyderabad", "pune", "chennai", "kolkata",
  "ahmedabad", "gurgaon", "gurugram", "noida", "faridabad", "jaipur",
  "lucknow", "kochi", "cochin", "chandigarh", "indore", "bhopal", "nagpur",
  "surat", "vadodara", "coimbatore", "visakhapatnam", "vizag", "navi mumbai",
  "thane", "ncr", "goa",
];

const REMOTE = [
  "remote",
  "work from home",
  "wfh",
  "fully remote",
  "100% remote",
  "anywhere",
  "distributed team",
  "work from anywhere",
];

function anyContains(haystack: string, needles: string[]): boolean {
  for (const n of needles) {
    if (haystack.includes(n)) return true;
  }
  return false;
}

export type FilterDecision =
  | { ok: true }
  | { ok: false; reason: string };

// ============================================================================
// Legitimacy heuristic (v10) — drops obvious scam / MLM / fake listings before
// they reach the LLM. Pure string matching, runs in <1ms per candidate.
// ============================================================================

const SCAM_SALARY = [
  "earn ₹",
  "earn rs ",
  "earn upto",
  "₹50,000 per day",
  "₹1,00,000 per",
  "$5000/week",
  "$5,000/week",
  "daily payout",
  "weekly payout",
  "guaranteed income",
  "unlimited earning",
  "unlimited income",
  "part-time earn",
  "earn unlimited",
];

const SCAM_MLM = [
  "network marketing",
  "build your team",
  "build your own team",
  "recruit members",
  "downline",
  "distributor opportunity",
  "financial freedom",
  "be your own boss",
  "mlm",
  "multi-level marketing",
  "team leader recruit",
];

const SCAM_CRYPTO = [
  "crypto trading no experience",
  "forex training",
  "forex signals",
  "binary options",
  "binary trading",
  "crypto mentor",
];

const SCAM_PAY_TO_WORK = [
  "training fee",
  "registration fee",
  "deposit required",
  "pay for kit",
  "investment required",
  "refundable deposit",
  "security deposit required",
];

const SCAM_CONTACT = [
  "whatsapp +",
  "whatsapp number",
  "whatsapp us",
  "telegram @",
  "telegram channel",
  "telegram group",
];

const SCAM_VAGUE_ROLE = [
  "data entry job",
  "copy paste work",
  "copy-paste work",
  "survey filling",
  "form filling",
  "captcha entry",
  "ad clicking",
  "ad posting work",
];

// Generic public-email domains that signal a non-corporate posting when they
// appear in a job description body (matched as substrings so e.g. "contact us
// at recruit@gmail.com" trips it).
const SCAM_PUBLIC_EMAILS = ["@gmail.com", "@yahoo.com", "@rediffmail.com", "@hotmail.com"];

// Company name patterns indicating a vague middleman / placement agency.
const SUSPICIOUS_COMPANY_PREFIXES = [
  "hr ",
  "hiring ",
  "recruiter ",
  "recruitment ",
  "consultancy",
  "consultancy ",
  "placement ",
  "career ",
  "careers ",
  "jobs ",
];

export function passesLegitimacyHeuristic(c: JobCandidate): FilterDecision {
  const title = c.title.toLowerCase();
  const company = c.company.toLowerCase().trim();
  const desc = c.description.slice(0, 4000).toLowerCase();
  const all = `${title} ${desc}`;

  if (anyContains(all, SCAM_SALARY)) return { ok: false, reason: "scam-salary" };
  if (anyContains(all, SCAM_MLM)) return { ok: false, reason: "scam-mlm" };
  if (anyContains(all, SCAM_CRYPTO)) return { ok: false, reason: "scam-crypto" };
  if (anyContains(all, SCAM_PAY_TO_WORK)) return { ok: false, reason: "scam-pay-to-work" };
  if (anyContains(all, SCAM_CONTACT)) return { ok: false, reason: "scam-contact" };
  if (anyContains(all, SCAM_VAGUE_ROLE)) return { ok: false, reason: "scam-vague-role" };
  if (anyContains(desc, SCAM_PUBLIC_EMAILS)) return { ok: false, reason: "scam-public-email" };

  // Suspiciously short / generic company names.
  if (company.length > 0 && company.length <= 3) {
    return { ok: false, reason: "suspicious-company-too-short" };
  }
  for (const prefix of SUSPICIOUS_COMPANY_PREFIXES) {
    if (company.startsWith(prefix)) {
      return { ok: false, reason: "suspicious-company-middleman" };
    }
  }

  return { ok: true };
}

export function passesTargetFilter(c: JobCandidate): FilterDecision {
  const title = c.title.toLowerCase();
  const loc = (c.location ?? "").toLowerCase();
  // Cap description scan for speed; first ~3k chars almost always contains
  // seniority/location/remote wording.
  const desc = c.description.slice(0, 3000).toLowerCase();
  const all = `${title} ${desc} ${loc}`;

  if (anyContains(title, SENIOR_TITLE)) {
    return { ok: false, reason: "senior-title" };
  }
  if (anyContains(title, TECH_HEAVY)) {
    return { ok: false, reason: "tech-role" };
  }
  // Reject roles that explicitly state 2+ years required in the description.
  if (anyContains(desc, TOO_EXPERIENCED)) {
    return { ok: false, reason: "too-experienced" };
  }
  if (!anyContains(all, ENTRY_LEVEL)) {
    return { ok: false, reason: "not-entry-level" };
  }
  if (!anyContains(all, BUSINESS)) {
    return { ok: false, reason: "not-business" };
  }

  // Only check the location field (not description) for geo — a Delhi job whose
  // description mentions "our Bengaluru office" should not pass.
  const inBlr = anyContains(loc, BENGALURU);
  const isRemote = anyContains(loc, REMOTE) || anyContains(desc, REMOTE) || anyContains(title, REMOTE);

  // Block other Indian cities explicitly — catches jobs with location "India" or
  // "Multiple locations" that list a non-BLR city in the location string.
  if (!isRemote && anyContains(loc, OTHER_INDIA_CITIES)) {
    return { ok: false, reason: "wrong-indian-city" };
  }

  if (!inBlr && !isRemote) {
    return { ok: false, reason: "wrong-location" };
  }

  return { ok: true };
}
