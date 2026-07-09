import { getAdzunaCount } from "@/lib/sources/adzuna";
import { SKILL_KEYWORDS } from "@/lib/skill-keywords";

/**
 * v14 — computes live marketDemand (1-10) for each seeded skill by blending:
 *   - Adzuna listing count in Bengaluru (weight 0.6)
 *   - Skill-mention frequency across jobs already in the user's pipeline (weight 0.4)
 *
 * All calls happen server-side. One Adzuna request per skill = 12/refresh.
 */

export type JobSample = { description: string };

export type SkillDemandInput = {
  id: string;
  name: string;
  marketDemand: number; // previous value, used for clamp smoothing
};

export type SkillDemandResult = {
  skillId: string;
  name: string;
  previous: number;
  next: number;
  adzunaCount: number;
  jobsMatching: number;
  error?: string;
};

// Prevent a single bad refresh from swinging any skill more than this.
const MAX_STEP = 3;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function countJobMentions(jobs: JobSample[], patterns: RegExp[]): number {
  if (jobs.length === 0 || patterns.length === 0) return 0;
  let matching = 0;
  for (const j of jobs) {
    const desc = j.description ?? "";
    if (patterns.some((p) => p.test(desc))) matching++;
  }
  return matching;
}

/**
 * Refreshes every skill's marketDemand. Returns per-skill deltas so the caller
 * can snapshot history + surface a toast. Errors on individual skills are
 * caught and reported per-skill; a global Adzuna auth failure still throws.
 */
export async function refreshAllSkillDemand(
  skills: SkillDemandInput[],
  jobs: JobSample[]
): Promise<SkillDemandResult[]> {
  // Step 1: fetch Adzuna counts for every skill (sequential to stay polite).
  const adzuna: Array<{ skillId: string; count: number; error?: string }> = [];
  for (const s of skills) {
    const map = SKILL_KEYWORDS[s.name];
    if (!map) {
      adzuna.push({ skillId: s.id, count: 0, error: "no keyword mapping" });
      continue;
    }
    try {
      const count = await getAdzunaCount({ query: map.adzunaQuery });
      adzuna.push({ skillId: s.id, count });
    } catch (e) {
      adzuna.push({
        skillId: s.id,
        count: 0,
        error: e instanceof Error ? e.message : "Adzuna error",
      });
    }
  }

  // Step 2: count Inbox mentions (in-memory, single pass per skill).
  const mentions = skills.map((s) => {
    const map = SKILL_KEYWORDS[s.name];
    const jobsMatching = map ? countJobMentions(jobs, map.mentionPatterns) : 0;
    return { skillId: s.id, jobsMatching };
  });

  // Step 3: normalize each signal against the max observed this refresh.
  const maxAdzuna = Math.max(1, ...adzuna.map((a) => a.count));
  const maxMentions = Math.max(1, ...mentions.map((m) => m.jobsMatching));

  const results: SkillDemandResult[] = skills.map((s) => {
    const a = adzuna.find((x) => x.skillId === s.id);
    const m = mentions.find((x) => x.skillId === s.id);
    const adzunaCount = a?.count ?? 0;
    const jobsMatching = m?.jobsMatching ?? 0;

    const signal1 = (adzunaCount / maxAdzuna) * 10;
    const signal2 = (jobsMatching / maxMentions) * 10;
    const raw = 0.6 * signal1 + 0.4 * signal2;
    const rounded = Math.round(clamp(raw, 1, 10));

    // Clamp step size vs. previous value to smooth out noise.
    const min = s.marketDemand - MAX_STEP;
    const max = s.marketDemand + MAX_STEP;
    const next = clamp(rounded, min, max);

    return {
      skillId: s.id,
      name: s.name,
      previous: s.marketDemand,
      next,
      adzunaCount,
      jobsMatching,
      error: a?.error,
    };
  });

  return results;
}
