import type { Kind } from "./types";

type Ctx = {
  fullName: string;
  resumeText: string;
  jobTitle: string;
  company: string;
  jobDescription: string;
};

const ctxBlock = (c: Ctx) => `# Candidate
Name: ${c.fullName}

# Candidate resume (plain text)
${c.resumeText || "(resume not provided)"}

# Target role
${c.jobTitle} at ${c.company}

# Job description
${c.jobDescription || "(job description not provided)"}
`;

export function buildFitScorePrompt(c: Ctx): { system: string; user: string } {
  return {
    system: `You are a career coach evaluating how well a candidate's resume fits a job description. Output ONLY a JSON object — no prose, no backticks, no explanation. Format: {"score": <0-100>, "reason": "<one concise sentence>"}`,
    user: `# Candidate resume\n${c.resumeText || "(not provided)"}\n\n# Job: ${c.jobTitle} at ${c.company}\n${c.jobDescription}\n\nScore the fit 0–100. Consider skills match, experience level, and domain overlap. One sentence reason.`,
  };
}

/**
 * Bundled analysis prompt — one call per job returns fit + summary + experience
 * required + learning potential, replacing 3-4 separate calls.
 */
export function buildJobAnalysisPrompt(c: Ctx): { system: string; user: string } {
  return {
    system: `You are an early-career coach evaluating job postings for a recent business graduate.
Output ONLY a JSON object — no prose, no backticks, no explanation. Format:
{
  "fitScore": <0-100>,
  "fitReason": "<one concise sentence>",
  "summary": "<two short sentences plainly describing what the role does, no fluff>",
  "experienceReq": "<short string — extract what the JD actually states: 'Entry level' | '0-1 years' | '1-2 years' | '2+ years' | 'unclear'>",
  "tooExperienced": <true if the JD requires 2 or more years of experience, false otherwise>,
  "learningPotential": <0-10 — how much skill and career growth a fresh grad would get in this specific role, based purely on the JD>,
  "legitimacyScore": <0-100 — how likely this is a real, legitimate posting from a real employer. 0-30 = obvious scam (MLM, crypto pump, "earn ₹50k/day", pay-to-work, vague employer, recruitment of an unspecified network of agents). 31-60 = suspicious / low-quality listing. 61-100 = looks like a real corporate role>,
  "redFlags": "<empty string if legitimacyScore >= 60. Otherwise a short comma-separated list of the specific red flags you saw, max 120 chars.>"
}

Legitimacy guidance:
- Real corporate roles at known companies → 80-100. Lack of a familiar company name alone is NOT a red flag (small startups are legit).
- Genuine red flags: MLM / pyramid language ("build your team", "downline"), crypto/forex pumps, "guaranteed income", training/registration fees demanded, WhatsApp/Telegram-only contact, raw gmail.com/yahoo.com addresses as the only contact for a "corporate" role, "no experience earn unlimited" phrasing, suspicious salary promises wildly above market.
- Vague "HR consultancy" / "Placement agency" reposts where the actual employer is hidden → 40-60.
- When uncertain, default to 70 and leave redFlags empty.`,
    user: `# Candidate resume\n${c.resumeText || "(not provided)"}\n\n# Job: ${c.jobTitle} at ${c.company}\n${c.jobDescription}\n\nReturn the JSON. Ground every field in the resume and JD above. Do not invent.`,
  };
}

/**
 * Per-company rating prompt — called once per unique new company, cached in DB.
 * Uses the LLM's training knowledge of Glassdoor/Blind/LinkedIn reviews.
 */
export function buildCompanyRatingPrompt(company: string): { system: string; user: string } {
  return {
    system: `You rate companies as employers based on what you know from publicly known sources (Glassdoor, Blind, LinkedIn, news, employee reviews) up to your training cutoff.
Output ONLY a JSON object — no prose, no backticks. Format:
{
  "prestige": <0-10 — brand recognition + employer reputation>,
  "reputation": <0-10 — employee experience + culture (lower if known toxic / glassdoor < 3.5)>,
  "notes": "<one short clause, e.g. 'top-tier fintech, strong eng culture' or 'unknown'>"
}
If you do not have grounded information about this company, return prestige=5, reputation=5, notes="unknown".`,
    user: `Company: "${company}"\n\nReturn the JSON rating.`,
  };
}

export function buildPrompt(kind: Kind, c: Ctx): { system: string; user: string } {
  const system = `You are a senior career coach helping ${c.fullName} apply for jobs. You ground every word in the candidate's actual resume and the actual job description provided. You never invent experience, education, or credentials. You write in clear, professional prose with no clichés ("results-driven", "passionate", "synergy", etc.). Output is GitHub-flavored Markdown.`;

  switch (kind) {
    case "COVER_LETTER":
      return {
        system,
        user: `${ctxBlock(c)}
# Task
Write a tailored cover letter for ${c.fullName} applying to ${c.jobTitle} at ${c.company}.

Constraints:
- 3 to 4 short paragraphs (under 350 words total).
- Open by naming the specific role and one concrete reason this candidate fits — drawn from the resume.
- Middle paragraph(s): connect 2–3 specific resume items to specific requirements in the job description.
- Close with a brief, confident sign-off. No "I look forward to hearing from you" filler.
- No bullet lists. No headings. Plain markdown paragraphs.
- Do NOT include the address block, date, or "Dear Hiring Manager," — start directly with the opening sentence.`,
      };

    case "RESUME_BULLETS":
      return {
        system,
        user: `${ctxBlock(c)}
# Task
Rewrite 5 to 7 resume bullets, drawn from the candidate's existing resume, to maximally align with the job description.

Constraints:
- Every bullet must be grounded in something the candidate actually did per the resume — do not invent experience.
- Lead each bullet with a strong past-tense verb.
- Quantify wherever the resume supports it; do not fabricate numbers.
- Reframe wording to mirror the language used in the job description where truthful.
- Output as a markdown bulleted list, one bullet per line, no preamble.`,
      };

    case "INTERVIEW_QUESTIONS":
      return {
        system,
        user: `${ctxBlock(c)}
# Task
Predict 5 interview questions a hiring manager is likely to ask for this specific role, and for each, give a one-line hint on which item in the candidate's resume best supports the answer.

Format (markdown):
1. **Question:** ...
   **Resume hook:** ...
2. ...

Constraints:
- Questions must be grounded in the job description's actual requirements — not generic.
- Resume hooks must point to a specific, real item from the resume above.`,
      };

    case "COMPANY_BRIEF":
      return {
        system,
        user: `${ctxBlock(c)}
# Task
Write a one-page brief on ${c.company} for an interview-prep audience.

Sections (markdown ##):
- **What they do** — derived from the job description and any company context inside it.
- **What this role exists to do** — read the JD and infer the team's mission.
- **What they likely value in this hire** — three specific qualities, each justified by a JD line.
- **Smart questions to ask the interviewer** — three questions the candidate could ask, each tied to something specific in the JD.

If you do not have grounded information for a section, mark the statement with "(speculative)". Do not invent facts about the company.`,
      };
  }
}
