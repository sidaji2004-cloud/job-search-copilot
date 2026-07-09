export const STATUSES = [
  "INBOX",
  "WISHLIST",
  "APPLIED",
  "INTERVIEWING",
  "OFFER",
  "REJECTED",
] as const;

export type Status = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<Status, string> = {
  INBOX: "Inbox",
  WISHLIST: "Wishlist",
  APPLIED: "Applied",
  INTERVIEWING: "Interviewing",
  OFFER: "Offer",
  REJECTED: "Rejected",
};

export const SOURCES = ["MANUAL", "BOOKMARKLET", "ADZUNA", "GREENHOUSE", "LEVER"] as const;
export type Source = (typeof SOURCES)[number];
export const SOURCE_LABEL: Record<Source, string> = {
  MANUAL: "Manual",
  BOOKMARKLET: "Bookmarklet",
  ADZUNA: "Adzuna",
  GREENHOUSE: "Greenhouse",
  LEVER: "Lever",
};

export const SAVED_SEARCH_KINDS = ["ADZUNA", "GREENHOUSE", "LEVER"] as const;
export type SavedSearchKind = (typeof SAVED_SEARCH_KINDS)[number];

export type SavedSearchDTO = {
  id: string;
  kind: SavedSearchKind;
  query: string;
  location: string | null;
  country: string | null;
  lastFetchedAt: string | null;
  createdAt: string;
};

export const KINDS = [
  "COVER_LETTER",
  "RESUME_BULLETS",
  "INTERVIEW_QUESTIONS",
  "COMPANY_BRIEF",
] as const;

export type Kind = (typeof KINDS)[number];

export const KIND_LABEL: Record<Kind, string> = {
  COVER_LETTER: "Cover Letter",
  RESUME_BULLETS: "Resume Bullets",
  INTERVIEW_QUESTIONS: "Interview Questions",
  COMPANY_BRIEF: "Company Brief",
};

export const KIND_DESCRIPTION: Record<Kind, string> = {
  COVER_LETTER: "A 3–4 paragraph cover letter tailored to this role.",
  RESUME_BULLETS: "5–7 rewritten resume bullets aligned to the job description.",
  INTERVIEW_QUESTIONS: "5 likely interview questions with answer hints.",
  COMPANY_BRIEF: "A one-page brief on the company and what they likely value.",
};

export type JobDTO = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  url: string | null;
  description: string;
  status: Status;
  position: number;
  notes: string | null;
  fitScore: number | null;
  fitReason: string | null;
  summary: string | null;
  experienceReq: string | null;
  learningPotential: number | null;
  companyPrestige: number | null;
  companyReputation: number | null;
  opportunityScore: number | null;
  source: Source;
  externalId: string | null;
  appliedAt: string | null;
  followUpAt: string | null;
  interviewAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GenerationDTO = {
  id: string;
  jobId: string;
  kind: Kind;
  content: string;
  model: string;
  createdAt: string;
};

// ============================================================================
// Skills Gap Tracker (v11)
// ============================================================================

export const SKILL_CATEGORIES = ["TECHNICAL", "TOOLS", "ANALYTICAL", "AI"] as const;
export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

export const SKILL_CATEGORY_LABEL: Record<SkillCategory, string> = {
  TECHNICAL: "Technical",
  TOOLS: "Tools",
  ANALYTICAL: "Analytical",
  AI: "AI",
};

// Per-category base learning rate (level points per hour at level 0).
// AI is lowest so the user can't farm easy gains in his already-strong area.
export const SKILL_BASE_RATE: Record<SkillCategory, number> = {
  TECHNICAL: 0.35,
  TOOLS: 0.4,
  ANALYTICAL: 0.3,
  AI: 0.25,
};

export type SkillDTO = {
  id: string;
  name: string;
  category: SkillCategory;
  marketDemand: number;       // 0-10, static
  currentLevel: number;       // 0.0-10.0, grows via logs
  position: number;
  resourceUrl: string | null;
  resourceName: string | null;
  updatedAt: string;
};

export type SkillLogDTO = {
  id: string;
  skillId: string;
  skillName: string;
  hours: number;
  note: string | null;
  levelGain: number;
  createdAt: string;
};

export type SkillsSummary = {
  criticalGaps: number;      // skills where (demand - level) >= 4
  strengths: number;         // skills where level >= demand
  marketReadiness: number;   // 0-100 weighted score
  goal: number;              // hardcoded 82 per the analysis
};
