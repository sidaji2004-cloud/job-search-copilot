import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

async function extractResume(): Promise<string> {
  const candidates = [
    path.join(process.cwd(), "resume.pdf"),
    path.join(process.cwd(), "..", "Sidharth_Ajith_Kumar_Resume.pdf"),
    "C:/Users/sidaj/Downloads/Sidharth_Ajith_Kumar_Resume.pdf",
  ];
  const pdfPath = candidates.find((p) => existsSync(p));
  if (!pdfPath) {
    console.warn("[seed] resume PDF not found; profile will start with empty resumeText.");
    return "";
  }
  // pdf-parse is CJS — import dynamically so seeding still works under ESM.
  const pdfParseModule = await import("pdf-parse");
  const pdfParse = (pdfParseModule.default ?? pdfParseModule) as (
    buf: Buffer
  ) => Promise<{ text: string }>;
  const buf = readFileSync(pdfPath);
  const out = await pdfParse(buf);
  return out.text.trim();
}

// v11 — Skills Gap Tracker seed. Idempotent: only inserts skills whose `name`
// does not already exist. NEVER overwrites currentLevel — the user's logged
// progress is preserved across re-seeds.
const SKILL_SEEDS: Array<{
  name: string;
  category: "TECHNICAL" | "TOOLS" | "ANALYTICAL" | "AI";
  marketDemand: number;
  initialLevel: number;
  position: number;
  resourceUrl: string;
  resourceName: string;
}> = [
  { name: "SQL / data querying", category: "TECHNICAL", marketDemand: 9, initialLevel: 2, position: 1,
    resourceUrl: "https://mode.com/sql-tutorial/", resourceName: "Mode Analytics SQL Tutorial" },
  { name: "CRM (Salesforce / HubSpot)", category: "TOOLS", marketDemand: 7, initialLevel: 2, position: 2,
    resourceUrl: "https://academy.hubspot.com/courses/hubspot-crm", resourceName: "HubSpot Academy — CRM Essentials" },
  { name: "Data viz (Tableau / Looker)", category: "TOOLS", marketDemand: 7, initialLevel: 2, position: 3,
    resourceUrl: "https://public.tableau.com/en-us/s/resources", resourceName: "Tableau Public — free training" },
  { name: "Stakeholder management", category: "ANALYTICAL", marketDemand: 8, initialLevel: 3, position: 4,
    resourceUrl: "https://www.coursera.org/learn/influencing-people", resourceName: "Coursera — Influencing People (audit)" },
  { name: "Python basics", category: "TECHNICAL", marketDemand: 5, initialLevel: 1, position: 5,
    resourceUrl: "https://www.kaggle.com/learn/python", resourceName: "Kaggle Learn — Python" },
  { name: "Excel / Google Sheets", category: "TOOLS", marketDemand: 8, initialLevel: 5, position: 6,
    resourceUrl: "https://excelexposure.com/", resourceName: "Excel Exposure (free course)" },
  { name: "Revenue metrics (ARR/NRR/MRR)", category: "ANALYTICAL", marketDemand: 7, initialLevel: 6, position: 7,
    resourceUrl: "https://chartmogul.com/resources/", resourceName: "ChartMogul resources" },
  { name: "GTM / outreach fundamentals", category: "ANALYTICAL", marketDemand: 6, initialLevel: 5, position: 8,
    resourceUrl: "https://www.outreach.io/resources", resourceName: "Outreach Sales Skill Library" },
  { name: "Funnel analytics", category: "ANALYTICAL", marketDemand: 8, initialLevel: 8, position: 9,
    resourceUrl: "https://www.lennysnewsletter.com/", resourceName: "Lenny's Newsletter (free posts)" },
  { name: "Owned AI project (proof of work)", category: "AI", marketDemand: 8, initialLevel: 8, position: 10,
    resourceUrl: "https://github.com/", resourceName: "This app — Job Search Copilot" },
  { name: "AI / LLM literacy", category: "AI", marketDemand: 8, initialLevel: 9, position: 11,
    resourceUrl: "https://github.com/anthropics/courses", resourceName: "Anthropic prompt engineering (free)" },
  { name: "Automation design (n8n / Zapier)", category: "AI", marketDemand: 7, initialLevel: 9, position: 12,
    resourceUrl: "https://docs.n8n.io/", resourceName: "n8n self-host docs (free OSS)" },
];

async function seedSkills() {
  let inserted = 0;
  let skipped = 0;
  for (const s of SKILL_SEEDS) {
    const existing = await prisma.skill.findUnique({ where: { name: s.name } });
    if (existing) {
      skipped++;
      continue;
    }
    await prisma.skill.create({
      data: {
        name: s.name,
        category: s.category,
        marketDemand: s.marketDemand,
        currentLevel: s.initialLevel,
        position: s.position,
        resourceUrl: s.resourceUrl,
        resourceName: s.resourceName,
      },
    });
    inserted++;
  }
  console.log(`[seed] skills: inserted ${inserted}, skipped ${skipped} (existing levels preserved).`);
}

async function main() {
  const existing = await prisma.profile.findUnique({ where: { id: 1 } });
  if (existing && existing.resumeText.length > 0) {
    console.log("[seed] profile already populated; skipping resume extraction.");
  } else {
    const resumeText = await extractResume();
    await prisma.profile.upsert({
      where: { id: 1 },
      update: { resumeText },
      create: {
        id: 1,
        fullName: "Sidharth Ajith Kumar",
        email: "sidaji2004@gmail.com",
        resumeText,
      },
    });
    console.log(`[seed] profile ready (${resumeText.length} chars of resume text).`);
  }
  await seedSkills();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
