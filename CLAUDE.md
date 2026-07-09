# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A personal Kanban-style job application tracker for a single non-technical user (Sidharth). Board has 5 columns (Wishlist → Applied → Interviewing → Offer → Rejected); each job card can generate an AI "kit" (cover letter, resume bullets, interview questions, company brief) via OpenRouter.

## Commands

```powershell
npm install              # install deps (also runs `prisma generate` via postinstall)
npm run dev               # start dev server at http://localhost:3000
npm run build              # prisma generate && next build
npm run db:push            # push prisma/schema.prisma to the local SQLite DB (no migration files — uses `db push`, not `migrate`)
npm run db:seed            # extract resume PDF into Profile.resumeText (idempotent — skips if already populated)
npm run lint
```

There is no test suite. There is no `prisma migrate` workflow — schema changes go through `db:push` directly against `prisma/dev.db`.

Env vars live in `.env` (DATABASE_URL only, committed-safe default) and `.env.local` (OPENROUTER_API_KEY, OPENROUTER_DEFAULT_MODEL, OPENROUTER_APP_TITLE — gitignored). See `.env.local.example`.

## Architecture

**Local-first, cloud-ready without rewrites.** This is the central constraint driving stack choices — see the table in README.md. Everything that differs between local and Vercel+Neon deploy is env/config, not code:
- DB: SQLite locally (`prisma/dev.db`) → Postgres in prod. The Prisma schema (`prisma/schema.prisma`) deliberately avoids Postgres-only types (arrays, jsonb) so the only change needed to deploy is flipping `provider = "sqlite"` → `"postgresql"` and setting `DATABASE_URL` to a Neon connection string.
- Everything else (Next.js app, API routes, OpenRouter calls) is identical between environments.

**Data model** (`prisma/schema.prisma`): `Job` → many `Generation` (one per `kind`, enforced by `@@unique([jobId, kind])` — generating a kind again *overwrites* via upsert, it doesn't append). `Profile` is a singleton row (`id` pinned to `1`) holding the resume text every prompt is grounded in. Status and Kind are plain strings (not Prisma enums) constrained by `STATUSES`/`KINDS` arrays in `lib/types.ts` — validate against those arrays in API routes, the DB won't reject bad values.

**AI generation flow**: `lib/prompts.ts` builds a `{system, user}` pair per `Kind` from `(profile.resumeText, job.title, job.company, job.description)`. `lib/openrouter.ts` is the only thing that talks to OpenRouter (plain `fetch` to the OpenAI-compatible endpoint, no SDK). The generate route (`app/api/jobs/[id]/generate/route.ts`) ties these together and upserts into `Generation`. Job creation (`app/api/jobs/route.ts`) also calls OpenRouter once, cheaply, to extract `{title, company, location}` JSON from scraped/pasted text when those fields are missing — this is a separate, simpler prompt inlined in that route, not in `lib/prompts.ts`.

**Scraping** (`lib/scrape.ts`): best-effort Cheerio fetch + JSON-LD `JobPosting` extraction. Many sites (LinkedIn) block this — the API returns a 400 with a message telling the user to paste text instead; there is no retry/proxy logic.

**Export** (`lib/export.ts`): converts the cached Markdown `Generation.content` to `.docx` (via `docx` library, hand-rolled line-by-line Markdown→Paragraph mapping — only headings/bullets/numbered lists/bold are supported) or `.pdf` (via `@react-pdf/renderer`, same flat line-based approach using `React.createElement` directly rather than JSX, since this file has a `.ts` extension). If you need richer Markdown support, extend the per-line `if` chains in both functions in tandem — they intentionally mirror each other's line-type detection.

**Board drag-and-drop** (`components/Board.tsx`): dnd-kit `DndContext` wraps 5 `Column`s. `onDragOver` does an optimistic in-memory status move for instant visual feedback; `onDragEnd` recomputes the full ordering for the target column via `arrayMove`, writes `position` indices, and persists via a single `PUT /api/jobs` bulk-update endpoint (not per-card PATCH calls). `JobCard` (sortable, draggable) and `JobCardVisual` (the same visual, no drag wiring) are split because `DragOverlay` needs a draggable-free render of the card being dragged.

**Design system**: the full Linear-style dark spec is in `design.md` at the repo root — read it before changing colors, spacing, radii, or type scale. Tokens are wired as CSS variables in `app/globals.css` (`:root`) and exposed to Tailwind via `tailwind.config.ts` (`theme.extend.colors`/`fontSize` reference `var(--token)`). Rule of thumb baked into the design: lavender (`--primary`) is reserved for brand mark / primary CTA / focus rings only — never use it as a column or card fill, and don't add a second chromatic accent. Depth comes from the 4-step surface ladder + hairline borders, not shadows.

## File map (non-obvious parts only)

- `lib/types.ts` — single source of truth for `Status`/`Kind` string unions and their display labels; both API routes and UI import from here.
- `lib/db.ts` — Prisma client singleton with the standard Next.js dev-mode global caching to survive hot reload.
- `prisma/seed.ts` — looks for the resume PDF at a few hardcoded fallback paths (including an absolute `C:/Users/sidaj/Downloads/...` path specific to this user's machine) since this is a single-user local app, not a generic template.
