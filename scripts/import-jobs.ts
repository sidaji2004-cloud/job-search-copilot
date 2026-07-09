/**
 * One-shot import of 100 job applications from the Excel tracker.
 * Run with: npx tsx scripts/import-jobs.ts
 * Idempotent — skips rows where (company + title) already exist in the DB.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Row = {
  title: string;
  company: string;
  location?: string;
  status: "APPLIED" | "INTERVIEWING" | "REJECTED" | "WISHLIST";
  notes?: string;
};

const JOBS: Row[] = [
  // ── APPLIED ── Sheet 1 ────────────────────────────────────────────────────
  { company: "Mastercard", title: "Associate – Advisors & Consulting Services", status: "APPLIED" },
  { company: "Pice", title: "Marketing Executive", status: "APPLIED" },
  { company: "Bain & Company", title: "Associate Consultant", status: "APPLIED" },
  { company: "Zepto", title: "Product Manager", status: "APPLIED" },
  { company: "Pratt & Whitney RTX", title: "Analyst – Supply Chain Management", status: "APPLIED" },
  { company: "Amazon Business", title: "Manager, Category Management, Beauty", status: "APPLIED" },
  { company: "JP Morgan", title: "Design Strategy Associate", status: "APPLIED", notes: "Under Review" },
  { company: "Google", title: "Business Development Consultant", status: "APPLIED" },
  { company: "IBM", title: "Package Consultant Commerce Transformation", status: "APPLIED" },
  { company: "HSBC", title: "Product Manager - Global Trade Solutions", status: "APPLIED" },
  { company: "VISA", title: "Sourcing Analyst - Travels & Events (Data Analyst)", status: "APPLIED" },
  { company: "Citi Bank", title: "Business Analyst", status: "APPLIED" },
  { company: "IDC", title: "Market Researcher", status: "APPLIED" },
  { company: "Slice", title: "Analyst", status: "APPLIED" },
  { company: "Mastercard", title: "Associate Managing Consultant", status: "APPLIED" },
  { company: "Cure Fit", title: "Quality Analyst", status: "APPLIED" },
  { company: "Cure Fit", title: "Category Manager", status: "APPLIED" },
  { company: "Unilever", title: "Analyst - Category Management", status: "APPLIED" },
  { company: "Wells Fargo", title: "Business Execution Associate", status: "APPLIED", notes: "Under Review" },
  { company: "JP Morgan", title: "Business Management - Analyst", status: "APPLIED", notes: "Under Consideration" },
  { company: "HP", title: "Junior ACM", status: "APPLIED", notes: "In Progress" },
  { company: "Navi", title: "Associate Product Manager", status: "APPLIED" },
  { company: "CRED", title: "Product & Growth - Payment Products", status: "APPLIED" },
  { company: "JP Morgan", title: "Business Management - Associate", status: "APPLIED" },
  { company: "Navi", title: "Co-lending & Partnership Operations", status: "APPLIED" },
  { company: "Swiggy", title: "Business Associate", status: "APPLIED" },
  { company: "Pice", title: "Business Executive", status: "APPLIED" },
  { company: "Loop", title: "Sales Development Rep", status: "APPLIED" },
  { company: "Accenture", title: "Business Advisory New Associate", status: "APPLIED" },
  { company: "Salesforce", title: "Sales Development Rep", status: "APPLIED", notes: "Under Consideration" },
  { company: "McGraw Hill", title: "Management Trainee - Business Development", status: "APPLIED" },
  { company: "McKinsey", title: "Junior Associate", status: "APPLIED" },
  { company: "JLL", title: "Assistant Manager - Transactions Management", status: "APPLIED" },
  { company: "ICON Plc", title: "Global Supply Chain Specialist", status: "APPLIED" },
  { company: "EY", title: "Associate Analyst", status: "APPLIED", notes: "Under Consideration" },
  { company: "Cardinal Health", title: "Coord, Data Management & Governance", status: "APPLIED", notes: "In Progress" },
  { company: "Noon", title: "Business Analyst", status: "APPLIED" },
  { company: "Allstate", title: "Operations", status: "APPLIED" },
  { company: "WSP", title: "Assistant, Project Management", status: "APPLIED", notes: "Under Consideration" },
  { company: "WSP", title: "Assistant Consultant, Project Planning", status: "APPLIED", notes: "Under Consideration" },

  // ── APPLIED ── Sheet 2 ────────────────────────────────────────────────────
  { company: "Archetype", title: "Junior Consultant", location: "Bengaluru, Karnataka, India", status: "APPLIED" },
  { company: "Aon", title: "IND Analyst/Consultant - US Insurance Operations", location: "Bengaluru, Karnataka, India", status: "APPLIED" },
  { company: "Aon", title: "IND Consultant - Policy Checking", location: "Bengaluru, Karnataka, India", status: "APPLIED" },
  { company: "PwC Acceleration Center India", title: "Workday DC - Associate 2", location: "Bengaluru, Karnataka, India", status: "APPLIED" },
  { company: "AlgoShack", title: "Partnership Sales Associate (SaaS / IT Services)", location: "Bengaluru, Karnataka, India", status: "APPLIED" },
  { company: "Together Light Incorporated", title: "Marketing Data Analyst & Project Coordinator", location: "India (Remote)", status: "APPLIED" },
  { company: "YipitData", title: "Data QA Associate", location: "India (Remote)", status: "APPLIED" },
  { company: "xPay (YC W24)", title: "Founder's Office - Growth", location: "Bengaluru, Karnataka, India", status: "APPLIED" },
  { company: "SwissRe", title: "Apprentice", location: "Bengaluru, Karnataka, India", status: "APPLIED" },
  { company: "Agoda", title: "Marketing Specialist, Pricing", location: "Bangkok, Thailand", status: "APPLIED" },
  { company: "Agoda", title: "Business Analyst - Beds Network", location: "Bangkok, Thailand", status: "APPLIED" },
  { company: "Gartner", title: "Business Development Executive", location: "Bengaluru, Karnataka, India", status: "APPLIED" },
  { company: "Slice", title: "Strategy & Operation Intern", location: "Bengaluru, Karnataka, India", status: "APPLIED" },
  { company: "Stadium", title: "Sales Development Representative - Outbound", location: "India (Remote)", status: "APPLIED" },
  { company: "BiteSpeed", title: "International BDR Intern", location: "Bengaluru, Karnataka, India", status: "APPLIED" },
  { company: "EY", title: "Analyst - Business Consulting Risk", location: "Bengaluru, Karnataka, India", status: "APPLIED" },
  { company: "Digital Green", title: "Growth Analyst I (IC Role)", location: "Bengaluru, Karnataka, India", status: "APPLIED" },
  { company: "Unisys", title: "Marketing Associate / Analyst and Advisor Relations", location: "Bengaluru, Karnataka, India", status: "APPLIED" },
  { company: "CISCO", title: "Associate Sales Trainee - Technical Graduate Apprentice", location: "Bengaluru, Karnataka, India", status: "APPLIED" },
  { company: "Glean", title: "Sales Development Representative", location: "Bengaluru, Karnataka, India", status: "APPLIED" },
  { company: "BetaNXT", title: "Operations, Associate", location: "Bengaluru, Karnataka, India", status: "APPLIED" },
  { company: "DevRev", title: "Sales Development Representative", location: "Bengaluru, Karnataka, India", status: "APPLIED" },
  { company: "Accenture", title: "Sales Operations New Associate", location: "Bengaluru, Karnataka, India", status: "APPLIED" },
  { company: "Cube", title: "Associate Product Manager", location: "Bengaluru, Karnataka, India", status: "APPLIED" },
  { company: "Cube", title: "Founder's Office (Growth and Strategy)", location: "Bengaluru, Karnataka, India", status: "APPLIED" },
  { company: "Slice", title: "Marketing Operations Intern", location: "Bengaluru, Karnataka, India", status: "APPLIED" },
  { company: "Amber", title: "Operations, Associate", location: "USA (Remote)", status: "APPLIED" },
  { company: "GSK", title: "Business Executive", location: "Bengaluru, Karnataka, India", status: "APPLIED" },
  { company: "Smallcase", title: "Business Operations Associate", location: "Bengaluru, Karnataka, India", status: "APPLIED" },
  { company: "American Express", title: "Apprentice", location: "Bengaluru, Karnataka, India", status: "APPLIED" },

  // ── INTERVIEWING ──────────────────────────────────────────────────────────
  { company: "IBM", title: "Enterprise Strategy Consultant", status: "INTERVIEWING", notes: "Round 1 attempted" },
  { company: "Cure Fit", title: "Business Development Executive", status: "INTERVIEWING", notes: "In Process" },
  { company: "D.E. Shaw", title: "Associate - Global Recruitment Operations (Talent Acquisition)", status: "INTERVIEWING", notes: "Round 1 attempted" },
  { company: "Gartner", title: "Market Research Specialist", status: "INTERVIEWING", notes: "In Process" },
  { company: "LSEG", title: "Associate Content Analyst", status: "INTERVIEWING", notes: "In Process" },

  // ── REJECTED — explicitly rejected ────────────────────────────────────────
  { company: "Meesho", title: "Associate – Marketing (Catalog & Merchandising)", status: "REJECTED" },
  { company: "Zepto", title: "Category Management Manager", status: "REJECTED" },
  { company: "Meesho", title: "Marketing Trainee", status: "REJECTED" },
  { company: "Thomson Reuters", title: "Business Analyst", status: "REJECTED" },
  { company: "Cure Fit", title: "Business Analyst", status: "REJECTED" },
  { company: "CAT", title: "Strategy Consultant", status: "REJECTED" },
  { company: "JP Morgan", title: "MarComm", status: "REJECTED" },
  { company: "Amazon Business", title: "Account Management Associate", status: "REJECTED" },
  { company: "Salesforce", title: "Business Development Representative", status: "REJECTED" },
  { company: "IQVIA", title: "Associate (Consulting)", status: "REJECTED" },
  { company: "Alcon", title: "Associate II, Complaints", status: "REJECTED" },

  // ── REJECTED — blank status (per user preference) ─────────────────────────
  { company: "Sama", title: "Associate", status: "REJECTED" },
  { company: "Aspire", title: "Strategy & Operations Intern", status: "REJECTED" },
  { company: "iBus", title: "Internship", status: "REJECTED" },
  { company: "Airtribe", title: "Business Development Intern", status: "REJECTED" },
  { company: "Ethos Life", title: "Partnership Operations Associate", status: "REJECTED" },
  { company: "Finmo", title: "Business Operation Intern", status: "REJECTED" },
  { company: "Cushman & Wakefield", title: "Internship", status: "REJECTED" },
  { company: "Cushman & Wakefield", title: "EIC Management Trainee", status: "REJECTED" },
  { company: "NTT Data", title: "Graduate Trainee", status: "REJECTED" },
  { company: "PayU", title: "Consultant (HR based)", status: "REJECTED" },
  { company: "Aspire", title: "Internship Program Growth", status: "REJECTED" },
  { company: "Pazcare", title: "KAM", status: "REJECTED" },
  { company: "Kaseya", title: "Sales Operations Analyst", status: "REJECTED" },
  { company: "Trimont", title: "Analyst Transaction & Processing", status: "REJECTED" },
];

async function main() {
  let added = 0;
  let skipped = 0;

  // Fetch existing (company, title) pairs once to avoid N individual lookups.
  const existing = await prisma.job.findMany({ select: { company: true, title: true } });
  const existingSet = new Set(existing.map((j) => `${j.company.toLowerCase()}::${j.title.toLowerCase()}`));

  // Group by status so we can assign position within each column.
  const byStatus = new Map<string, Row[]>();
  for (const row of JOBS) {
    if (!byStatus.has(row.status)) byStatus.set(row.status, []);
    byStatus.get(row.status)!.push(row);
  }

  // Find current max position per status to append after existing cards.
  const maxPositions = await prisma.job.groupBy({
    by: ["status"],
    _max: { position: true },
  });
  const maxPos: Record<string, number> = {};
  for (const g of maxPositions) {
    maxPos[g.status] = g._max.position ?? -1;
  }

  for (const [status, rows] of byStatus) {
    let pos = (maxPos[status] ?? -1) + 1;
    for (const row of rows) {
      const key = `${row.company.toLowerCase()}::${row.title.toLowerCase()}`;
      if (existingSet.has(key)) {
        skipped++;
        continue;
      }
      await prisma.job.create({
        data: {
          title: row.title,
          company: row.company,
          location: row.location ?? null,
          description: "",
          status,
          position: pos++,
          notes: row.notes ?? null,
          source: "MANUAL",
        },
      });
      existingSet.add(key);
      added++;
    }
  }

  console.log(`\nDone. Added ${added} · Skipped ${skipped} (already in DB)\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
