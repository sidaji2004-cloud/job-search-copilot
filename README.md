# Job Search Copilot

A personal Kanban-style job application tracker that sources roles automatically, scores them against your resume, and generates AI cover letters, tailored resume bullets, interview prep, and company briefs. Also tracks your skills gap against live market demand and your application funnel over time. Runs locally with zero hosting cost; deploys to Vercel + Neon Postgres later without code changes.

## Quick start

> **You need Node.js 18.18+ installed.** If `node --version` doesn't work, install it first from <https://nodejs.org/> (the LTS download). Reopen your terminal after install so the PATH refreshes.

```powershell
# 1. Install dependencies (one-time, ~2 minutes)
npm install

# 2. Get your OpenRouter API key
#    Visit https://openrouter.ai/keys, create a key, then:
copy .env.local.example .env.local
#    Open .env.local in Notepad and replace `sk-or-v1-...` with your real key.

# 3. Create the local SQLite database
npm run db:push

# 4. Seed your profile (extracts your resume PDF into the DB)
npm run db:seed

# 5. Run the app
npm run dev
```

Open <http://localhost:3000>.

If the seed can't find your resume, place a copy at `resume.pdf` in this folder and re-run `npm run db:seed`.

## What it does

- **Pipeline board** — six columns (Inbox · Wishlist · Applied · Interviewing · Offer · Rejected). Drag cards between stages.
- **Automated sourcing** — an Inbox column that fills itself hourly from Adzuna, Greenhouse, and Lever, filtered against your target profile and screened for legitimacy. A browser bookmarklet also captures roles from any job site with one click.
- **Add a job manually** — paste a URL (we scrape the page) or paste the job description text.
- **AI scoring** — every sourced role is ranked on resume fit, company prestige, learning potential, and reputation into a single opportunity score.
- **Generate kit** — for each card, generate:
  - A tailored cover letter
  - Rewritten resume bullets aligned to the role
  - Five likely interview questions with answer hints
  - A one-page company brief
- **Export** — download any generated artifact as `.docx` or `.pdf`.
- **/skills** — a live skills-gap tracker comparing your level against real market demand (pulled from Adzuna + your own pipeline), with practice logging and a weighted readiness score.
- **/stats** — application funnel conversion, rejection-reason breakdown, and source quality over time.
- **Gmail sync + daily digest** — read-only Gmail scanning suggests stage moves from interview/rejection/offer emails; an optional 8am digest emails your top new roles.
- **/settings** — edit your stored resume text; manage saved searches and watched companies; check OpenRouter key + model.

## How it's built

| Concern | Local | Cloud (later) |
| --- | --- | --- |
| Hosting | `npm run dev` | Vercel (Hobby, $0) |
| Database | SQLite file `prisma/dev.db` | Neon Postgres ($0 free tier) |
| AI | OpenRouter (your key) | OpenRouter (your key) |

To deploy on Vercel:
1. Push to GitHub.
2. Create a free Neon database; copy its connection string.
3. In `prisma/schema.prisma`, change `provider = "sqlite"` → `provider = "postgresql"`.
4. On Vercel, set env vars: `DATABASE_URL`, `OPENROUTER_API_KEY`, `OPENROUTER_DEFAULT_MODEL`.
5. Vercel runs `prisma generate` + `next build` automatically.

No application code changes required.

## Design

The UI follows the Linear-style dark design system documented in [design.md](./design.md): `#010102` canvas, four-step surface ladder, lavender `#5e6ad2` reserved for the brand mark, primary CTA, and focus rings. Inter substitutes for Linear's display sans; JetBrains Mono for the mono cuts.
