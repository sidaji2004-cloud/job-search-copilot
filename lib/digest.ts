import { prisma } from "./db";

type DigestJob = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  url: string | null;
  fitScore: number | null;
  opportunityScore: number | null;
  summary: string | null;
};

/**
 * Pulls top N new INBOX roles created since `since`, ranked by opportunityScore.
 * Mirrors the GET /api/jobs ranking logic so the digest matches what you'd see
 * in the Inbox column.
 */
export async function buildDigest({
  since,
  limit = 5,
}: {
  since: Date;
  limit?: number;
}): Promise<{ subject: string; html: string; text: string; jobs: DigestJob[] }> {
  const jobs = await prisma.job.findMany({
    where: { status: "INBOX", createdAt: { gte: since } },
  });

  // Join CompanyRating to compute opportunityScore (same formula as /api/jobs).
  const keys = Array.from(
    new Set(jobs.map((j) => j.company.trim().toLowerCase()).filter(Boolean))
  );
  const ratings = await prisma.companyRating.findMany({
    where: { companyKey: { in: keys } },
  });
  const ratingByKey = new Map(ratings.map((r) => [r.companyKey, r]));

  const ranked: DigestJob[] = jobs
    .map((j) => {
      const r = ratingByKey.get(j.company.trim().toLowerCase());
      const prestige = r?.prestige ?? 5;
      const reputation = r?.reputation ?? 5;
      const fit = j.fitScore ?? 50;
      const learn = j.learningPotential ?? 5;
      const opportunityScore = Math.round(
        fit * 0.5 + prestige * 10 * 0.2 + learn * 10 * 0.2 + reputation * 10 * 0.1
      );
      return {
        id: j.id,
        title: j.title,
        company: j.company,
        location: j.location,
        url: j.url,
        fitScore: j.fitScore,
        opportunityScore,
        summary: j.summary,
      };
    })
    .sort((a, b) => (b.opportunityScore ?? -1) - (a.opportunityScore ?? -1))
    .slice(0, limit);

  if (ranked.length === 0) {
    return {
      subject: "No new roles today — JobSearch Copilot",
      html: emptyHtml(),
      text: "No new roles came through your filters in the last 24 hours.",
      jobs: [],
    };
  }

  const subject = `Today's ${ranked.length} best opportunit${ranked.length === 1 ? "y" : "ies"} — JobSearch Copilot`;
  return {
    subject,
    html: renderHtml(ranked),
    text: renderText(ranked),
    jobs: ranked,
  };
}

function emptyHtml(): string {
  return wrap(`
    <h2 style="margin:0 0 12px 0;font-size:18px;font-weight:600;color:#e6e6e6">No new roles today</h2>
    <p style="margin:0;color:#a0a0a8;font-size:14px;line-height:1.5">
      Nothing new came through your filters in the last 24 hours. Sources will keep watching.
    </p>
  `);
}

function renderHtml(jobs: DigestJob[]): string {
  const rows = jobs
    .map(
      (j) => `
    <div style="border:1px solid #2a2a30;border-radius:10px;padding:16px;margin-bottom:12px;background:#15151a">
      <div style="display:flex;align-items:start;justify-content:space-between;gap:12px">
        <div style="flex:1;min-width:0">
          <div style="font-size:15px;font-weight:600;color:#e6e6e6;line-height:1.3;margin-bottom:4px">
            ${escapeHtml(j.title)}
          </div>
          <div style="font-size:13px;color:#a0a0a8;margin-bottom:8px">
            ${escapeHtml(j.company)}${j.location ? ` · ${escapeHtml(j.location)}` : ""}
          </div>
          ${
            j.summary
              ? `<div style="font-size:13px;color:#c0c0c8;line-height:1.5">${escapeHtml(j.summary)}</div>`
              : ""
          }
        </div>
        <div style="flex:none;text-align:right">
          ${
            j.opportunityScore != null
              ? `<div style="display:inline-block;padding:3px 10px;border-radius:999px;background:rgba(94,106,210,0.15);border:1px solid rgba(94,106,210,0.4);color:#a5aef0;font-size:12px;font-weight:600;margin-bottom:4px">★ ${j.opportunityScore}</div>`
              : ""
          }
          ${
            j.fitScore != null
              ? `<div style="font-size:12px;color:#a0a0a8">${j.fitScore}% fit</div>`
              : ""
          }
        </div>
      </div>
    </div>
  `
    )
    .join("");

  return wrap(`
    <h2 style="margin:0 0 6px 0;font-size:18px;font-weight:600;color:#e6e6e6">Today's best opportunities</h2>
    <p style="margin:0 0 20px 0;color:#a0a0a8;font-size:13px">Ranked by opportunity score — fit, prestige, learning, reputation.</p>
    ${rows}
    <div style="text-align:center;margin-top:24px">
      <a href="http://localhost:3000" style="display:inline-block;padding:10px 20px;background:#5e6ad2;color:white;text-decoration:none;border-radius:8px;font-size:14px;font-weight:500">
        Open the board
      </a>
    </div>
  `);
}

function wrap(content: string): string {
  return `<!doctype html>
<html>
<body style="margin:0;padding:24px;background:#010102;font-family:-apple-system,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:560px;margin:0 auto">
    ${content}
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #2a2a30;text-align:center;font-size:11px;color:#6a6a72">
      JobSearch Copilot · local-first · runs on your laptop
    </div>
  </div>
</body>
</html>`;
}

function renderText(jobs: DigestJob[]): string {
  return (
    "Today's best opportunities:\n\n" +
    jobs
      .map(
        (j, i) =>
          `${i + 1}. ${j.title} — ${j.company}${j.location ? ` · ${j.location}` : ""}\n` +
          `   Opportunity ${j.opportunityScore ?? "?"} · Fit ${j.fitScore ?? "?"}%\n` +
          (j.summary ? `   ${j.summary}\n` : "")
      )
      .join("\n") +
    "\n\nOpen: http://localhost:3000\n"
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
