/**
 * v14 — Maps each of the 12 seeded skills to:
 *   - `adzunaQuery`: the Adzuna `what` search term for counting live listings in Bengaluru.
 *   - `mentionPatterns`: regexes for scanning descriptions of jobs already in the pipeline.
 *
 * Keys MUST match `Skill.name` from prisma/seed.ts exactly.
 */
export type SkillKeywordMap = {
  adzunaQuery: string;
  mentionPatterns: RegExp[];
};

export const SKILL_KEYWORDS: Record<string, SkillKeywordMap> = {
  "SQL / data querying": {
    adzunaQuery: "sql",
    mentionPatterns: [/\bsql\b/i, /\bqueries?\b/i, /\bpostgres\b/i, /\bmysql\b/i, /\bdata warehouse\b/i, /\bbigquery\b/i, /\bredshift\b/i],
  },
  "CRM (Salesforce / HubSpot)": {
    adzunaQuery: "salesforce hubspot crm",
    mentionPatterns: [/\bsalesforce\b/i, /\bhubspot\b/i, /\bcrm\b/i, /\bpipeline management\b/i, /\bpipedrive\b/i, /\bzoho\b/i],
  },
  "Data viz (Tableau / Looker)": {
    adzunaQuery: "tableau looker power bi",
    mentionPatterns: [/\btableau\b/i, /\blooker\b/i, /\bpower bi\b/i, /\bdashboards?\b/i, /\bdata visualization\b/i, /\bdata visualisation\b/i, /\bmetabase\b/i],
  },
  "Stakeholder management": {
    adzunaQuery: "stakeholder management",
    mentionPatterns: [/\bstakeholder/i, /cross[- ]functional/i, /\bcommunication skills\b/i, /\bpartner with\b/i, /\bbusiness partner/i],
  },
  "Python basics": {
    adzunaQuery: "python",
    mentionPatterns: [/\bpython\b/i, /\bpandas\b/i, /\bnumpy\b/i, /\bscripting\b/i, /\bjupyter\b/i],
  },
  "Excel / Google Sheets": {
    adzunaQuery: "excel google sheets",
    mentionPatterns: [/\bexcel\b/i, /\bgoogle sheets\b/i, /\bspreadsheets?\b/i, /\bvlookup\b/i, /\bpivot tables?\b/i],
  },
  "Revenue metrics (ARR/NRR/MRR)": {
    adzunaQuery: "revenue operations ARR MRR",
    mentionPatterns: [/\barr\b/i, /\bmrr\b/i, /\bnrr\b/i, /\brevenue metrics?\b/i, /\bunit economics\b/i, /\bltv\b/i, /\bcac\b/i],
  },
  "GTM / outreach fundamentals": {
    adzunaQuery: "sales development outbound outreach",
    mentionPatterns: [/\bgo[- ]to[- ]market\b/i, /\bgtm\b/i, /\bcold outreach\b/i, /\boutbound\b/i, /\bprospecting\b/i, /\bsdr\b/i, /\bbdr\b/i],
  },
  "Funnel analytics": {
    adzunaQuery: "funnel analytics conversion",
    mentionPatterns: [/\bfunnel\b/i, /\bconversion rate\b/i, /\bcohort/i, /\bretention\b/i, /\ba\/b test/i, /\bactivation\b/i],
  },
  "Owned AI project (proof of work)": {
    adzunaQuery: "portfolio ai project",
    mentionPatterns: [/\bside project\b/i, /\bportfolio\b/i, /\bshipped\b/i, /\bbuilt an? (app|tool|product|system)\b/i, /\bhackathon\b/i],
  },
  "AI / LLM literacy": {
    adzunaQuery: "AI LLM prompt engineering",
    mentionPatterns: [/\bllm\b/i, /\bgpt\b/i, /\bclaude\b/i, /\bopenai\b/i, /\banthropic\b/i, /\bprompt engineering\b/i, /\bgenerative ai\b/i, /\bcopilot\b/i],
  },
  "Automation design (n8n / Zapier)": {
    adzunaQuery: "automation zapier workflow",
    mentionPatterns: [/\bzapier\b/i, /\bn8n\b/i, /\bmake\.com\b/i, /\bworkflow automation\b/i, /\bprocess automation\b/i, /\brpa\b/i, /\bautomate\b/i],
  },
};
