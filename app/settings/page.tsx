"use client";

import { useEffect, useRef, useState } from "react";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Plus,
  Upload,
  Bookmark,
  Sparkles,
  Mail,
  Inbox,
  ShieldCheck,
} from "lucide-react";
import { TopNav } from "@/components/TopNav";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import type { SavedSearchDTO, SavedSearchKind } from "@/lib/types";

type ProfileShape = {
  id: number;
  fullName: string;
  email: string;
  resumeText: string;
  updatedAt: string;
};

export default function SettingsPage() {
  const [profile, setProfile] = useState<ProfileShape | null>(null);
  const [hasOpenrouter, setHasOpenrouter] = useState(false);
  const [defaultModel, setDefaultModel] = useState("");
  const [searches, setSearches] = useState<SavedSearchDTO[]>([]);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const [pr, sr] = await Promise.all([
      fetch("/api/profile").then((r) => r.json()),
      fetch("/api/saved-searches").then((r) => r.json()),
    ]);
    setProfile(pr.profile);
    setHasOpenrouter(pr.hasOpenrouter);
    setDefaultModel(pr.defaultModel);
    setSearches(sr.searches ?? []);
  }

  return (
    <div className="min-h-screen text-ink">
      <TopNav />
      <main className="page-enter mx-auto max-w-3xl px-6 pt-10 pb-24 space-y-6">
        <div>
          <h1 className="text-headline text-ink">Settings</h1>
          <p className="mt-1 text-body-sm text-ink-subtle">
            Your profile, automated discovery, and the bookmarklet.
          </p>
        </div>

        <OpenRouterSection has={hasOpenrouter} defaultModel={defaultModel} />
        {profile && (
          <ProfileSection profile={profile} onUpdate={setProfile} onReload={load} />
        )}
        <SeedDefaultsCard onReload={load} />
        <SweepInboxCard />
        <SavedSearchesSection searches={searches} onReload={load} />
        <DigestCard />
        <GmailSyncCard />
        <CleanupSection />
        <BookmarkletSection />
      </main>
    </div>
  );
}

function OpenRouterSection({
  has,
  defaultModel,
}: {
  has: boolean;
  defaultModel: string;
}) {
  return (
    <section className="rounded-lg border border-hairline bg-surface-1 p-6 edge-highlight">
      <h2 className="text-card-title text-ink">OpenRouter</h2>
      <p className="mt-1 text-body-sm text-ink-subtle">
        All AI generation flows through OpenRouter using the key in your{" "}
        <code className="font-mono text-[12px] text-ink-muted">.env.local</code>.
      </p>
      <div className="mt-4 flex items-center gap-3">
        {has ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span className="text-body-sm text-ink">API key detected.</span>
          </>
        ) : (
          <>
            <AlertTriangle className="h-4 w-4 text-[#f5a623]" />
            <span className="text-body-sm text-ink">
              No <code className="font-mono text-[12px] text-ink-muted">OPENROUTER_API_KEY</code>{" "}
              in <code className="font-mono text-[12px] text-ink-muted">.env.local</code>.
            </span>
          </>
        )}
      </div>
      <div className="mt-5">
        <label className="text-caption text-ink-subtle">Default model</label>
        <p className="mt-1.5 font-mono text-body-sm text-ink-muted">
          {defaultModel || "anthropic/claude-sonnet-4.5"}
        </p>
      </div>
    </section>
  );
}

function ProfileSection({
  profile,
  onUpdate,
  onReload,
}: {
  profile: ProfileShape;
  onUpdate: (p: ProfileShape) => void;
  onReload: () => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: profile.fullName,
        email: profile.email,
        resumeText: profile.resumeText,
      }),
    });
    setSaving(false);
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2000);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/profile", { method: "PUT", body: fd });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) {
      setUploadMsg(data.error || "Upload failed.");
      return;
    }
    setUploadMsg(`Loaded ${data.chars} characters from ${file.name}.`);
    await onReload();
  }

  return (
    <section className="rounded-lg border border-hairline bg-surface-1 p-6 edge-highlight">
      <h2 className="text-card-title text-ink">Profile</h2>
      <p className="mt-1 text-body-sm text-ink-subtle">
        Your resume is the source for every cover letter, bullet rewrite, and fit score.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div>
          <label className="text-caption text-ink-subtle">Full name</label>
          <Input
            className="mt-1.5"
            value={profile.fullName}
            onChange={(e) => onUpdate({ ...profile, fullName: e.target.value })}
          />
        </div>
        <div>
          <label className="text-caption text-ink-subtle">Email</label>
          <Input
            className="mt-1.5"
            type="email"
            value={profile.email}
            onChange={(e) => onUpdate({ ...profile, email: e.target.value })}
          />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between rounded-md border border-hairline bg-surface-2 px-4 py-3">
        <div>
          <div className="text-body-sm text-ink">Replace resume (PDF)</div>
          <div className="text-caption text-ink-tertiary mt-0.5">
            Upload a new CV. We&apos;ll extract the text and overwrite the resume below.
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          onChange={onFile}
          className="hidden"
        />
        <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? "Reading…" : "Upload PDF"}
        </Button>
      </div>
      {uploadMsg && (
        <p className="mt-2 text-caption text-ink-muted">{uploadMsg}</p>
      )}

      <div className="mt-4">
        <label className="text-caption text-ink-subtle">Resume (plain text)</label>
        <Textarea
          className="mt-1.5 font-mono text-[13px]"
          rows={16}
          value={profile.resumeText}
          onChange={(e) => onUpdate({ ...profile, resumeText: e.target.value })}
        />
      </div>

      <div className="mt-5 flex items-center justify-between">
        <span className="text-caption text-ink-tertiary">
          {savedAt ? (
            <span className="inline-flex items-center gap-1 text-success">
              <CheckCircle2 className="h-3.5 w-3.5" /> Saved
            </span>
          ) : (
            <>Last updated {new Date(profile.updatedAt).toLocaleString()}</>
          )}
        </span>
        <Button variant="primary" onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </section>
  );
}

function SeedDefaultsCard({ onReload }: { onReload: () => Promise<void> }) {
  const [counts, setCounts] = useState<{ total: number; present: number; missing: number } | null>(
    null
  );
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ added: number; skipped: number } | null>(null);

  useEffect(() => {
    void fetch("/api/saved-searches/seed")
      .then((r) => r.json())
      .then((d) => setCounts(d));
  }, []);

  async function seed() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/saved-searches/seed", { method: "POST" });
      const data = (await res.json()) as { added: number; skipped: number };
      setResult(data);
      const after = await fetch("/api/saved-searches/seed").then((r) => r.json());
      setCounts(after);
      await onReload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-hairline bg-surface-1 p-6 edge-highlight">
      <div className="flex items-start gap-3">
        <div className="rounded-md border border-primary/30 bg-primary/10 p-2 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-card-title text-ink">Quick start — seed defaults</h2>
          <p className="mt-1 text-body-sm text-ink-subtle">
            Add a fresher-focused mix of Adzuna keyword searches (across RevOps, SalesOps,
            BizOps, Founder&apos;s Office, ProductOps, and rotational programs) plus Greenhouse
            and Lever boards for companies with confirmed fresher pipelines — Razorpay,
            Cred, Postman, Chargebee, Freshworks, Zepto, Meesho, Atlassian, Stripe,
            Anthropic, and more. Idempotent — running this again only adds what&apos;s missing.
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4">
        <div className="text-caption text-ink-tertiary">
          {counts
            ? `${counts.present} of ${counts.total} defaults already added · ${counts.missing} would be added`
            : "Checking…"}
        </div>
        <Button variant="primary" onClick={seed} disabled={busy || counts?.missing === 0}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy
            ? "Seeding…"
            : counts?.missing === 0
            ? "All defaults present"
            : `Seed ${counts?.missing ?? ""} default${counts?.missing === 1 ? "" : "s"}`}
        </Button>
      </div>

      {result && (
        <div className="mt-3 rounded-md border border-hairline bg-surface-2 px-3 py-2 text-caption text-ink-muted">
          Added <span className="text-success font-medium">{result.added}</span> · Skipped{" "}
          <span className="text-ink">{result.skipped}</span>
        </div>
      )}
    </section>
  );
}

function SweepInboxCard() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    scanned: number;
    keywordDropped: number;
    llmDropped: { tooExperienced: number; scam: number; misaligned: number };
    kept: number;
    errors: number;
    durationMs: number;
  } | null>(null);

  async function sweep() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/jobs/inbox-sweep", { method: "POST" });
      const data = await res.json();
      setResult(data);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-hairline bg-surface-1 p-6 edge-highlight">
      <div className="flex items-start gap-3">
        <div className="rounded-md border border-hairline-strong bg-surface-2 p-2 text-ink-muted">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-card-title text-ink">Sweep Inbox (experience + scam + alignment)</h2>
          <p className="mt-1 text-body-sm text-ink-subtle">
            Re-evaluate every Inbox role against the current rules and remove anything that
            requires more than 1 year of experience, looks like a scam, or is genuinely
            misaligned with your background. Safe to re-run — survivors get their scores
            cached so subsequent sweeps are cheap. Runs only when you click — never automatic.
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end">
        <Button variant="primary" onClick={sweep} disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? "Sweeping…" : "Sweep Inbox now"}
        </Button>
      </div>

      {result && (
        <div className="mt-3 rounded-md border border-hairline bg-surface-2 px-3 py-2 text-caption text-ink-muted">
          Scanned <span className="text-ink font-medium">{result.scanned}</span> · removed{" "}
          <span className="text-ink font-medium">
            {result.keywordDropped +
              result.llmDropped.tooExperienced +
              result.llmDropped.scam +
              result.llmDropped.misaligned}
          </span>{" "}
          (<span className="text-ink">{result.keywordDropped}</span> keyword,{" "}
          <span className="text-ink">{result.llmDropped.tooExperienced}</span> over-experienced,{" "}
          <span className="text-ink">{result.llmDropped.scam}</span> scam,{" "}
          <span className="text-ink">{result.llmDropped.misaligned}</span> misaligned) · kept{" "}
          <span className="text-success font-medium">{result.kept}</span>
          {result.errors > 0 && (
            <>
              {" "}
              · <span className="text-ink">{result.errors}</span> errors
            </>
          )}
        </div>
      )}
    </section>
  );
}

function SavedSearchesSection({
  searches,
  onReload,
}: {
  searches: SavedSearchDTO[];
  onReload: () => Promise<void>;
}) {
  const [kind, setKind] = useState<SavedSearchKind>("ADZUNA");
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [country, setCountry] = useState("in");
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function add() {
    setAdding(true);
    setErr(null);
    const body: Record<string, string | null> = { kind, query: query.trim() };
    if (kind === "ADZUNA") {
      body.location = location.trim() || null;
      body.country = country.trim() || "in";
    }
    const res = await fetch("/api/saved-searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setAdding(false);
    if (!res.ok) {
      const data = await res.json();
      setErr(data.error || "Failed to add.");
      return;
    }
    setQuery("");
    setLocation("");
    await onReload();
  }

  async function remove(id: string) {
    await fetch(`/api/saved-searches?id=${id}`, { method: "DELETE" });
    await onReload();
  }

  return (
    <section className="rounded-lg border border-hairline bg-surface-1 p-6 edge-highlight">
      <h2 className="text-card-title text-ink">Automated discovery</h2>
      <p className="mt-1 text-body-sm text-ink-subtle">
        Saved searches the app runs whenever you start it or hit Refresh. Matches appear in the
        Inbox column, scored against your resume.
      </p>

      <div className="mt-5 space-y-2">
        {searches.length === 0 && (
          <div className="rounded-md border border-dashed border-hairline px-4 py-6 text-center text-caption text-ink-tertiary">
            Nothing configured yet. Add an Adzuna keyword search or a company below.
          </div>
        )}
        {searches.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between rounded-md border border-hairline bg-surface-2 px-3 py-2"
          >
            <div className="min-w-0">
              <div className="text-body-sm text-ink">
                <span className="font-mono text-[12px] text-ink-tertiary mr-2">{s.kind}</span>
                {s.query}
                {s.location && (
                  <span className="text-ink-subtle"> · {s.location}</span>
                )}
                {s.country && s.kind === "ADZUNA" && (
                  <span className="text-ink-tertiary"> ({s.country})</span>
                )}
              </div>
              <div className="text-caption text-ink-tertiary mt-0.5">
                {s.lastFetchedAt
                  ? `Last fetched ${new Date(s.lastFetchedAt).toLocaleString()}`
                  : "Never fetched"}
              </div>
            </div>
            <button
              onClick={() => remove(s.id)}
              className="rounded-md p-1.5 text-ink-tertiary hover:text-[#e5484d] hover:bg-surface-3 transition-colors"
              aria-label="Remove"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-md border border-hairline bg-surface-2 p-4 space-y-3">
        <div className="text-body-sm font-medium text-ink">Add new</div>

        <div className="grid grid-cols-3 gap-2">
          {(["ADZUNA", "GREENHOUSE", "LEVER"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`h-9 rounded-md border px-3 text-body-sm transition-colors ${
                kind === k
                  ? "border-primary text-ink bg-surface-1"
                  : "border-hairline text-ink-subtle hover:text-ink hover:bg-surface-1"
              }`}
            >
              {k === "ADZUNA" ? "Adzuna search" : k === "GREENHOUSE" ? "Greenhouse co." : "Lever co."}
            </button>
          ))}
        </div>

        <div>
          <label className="text-caption text-ink-subtle">
            {kind === "ADZUNA" ? "Keywords" : "Company slug"}
          </label>
          <Input
            className="mt-1.5"
            placeholder={
              kind === "ADZUNA"
                ? "e.g. Product Manager"
                : kind === "GREENHOUSE"
                ? "e.g. stripe"
                : "e.g. netflix"
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {kind !== "ADZUNA" && (
            <p className="mt-1.5 text-caption text-ink-tertiary">
              The company&apos;s handle in {kind === "GREENHOUSE" ? "Greenhouse" : "Lever"} —
              usually the last bit of their careers URL. Examples:{" "}
              <span className="font-mono">stripe</span>, <span className="font-mono">notion</span>,{" "}
              <span className="font-mono">vercel</span>.
            </p>
          )}
        </div>

        {kind === "ADZUNA" && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-caption text-ink-subtle">Location (optional)</label>
              <Input
                className="mt-1.5"
                placeholder="Bangalore"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div>
              <label className="text-caption text-ink-subtle">Country code</label>
              <Input
                className="mt-1.5"
                placeholder="in"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
              <p className="mt-1 text-caption text-ink-tertiary">
                <span className="font-mono">in</span> India ·{" "}
                <span className="font-mono">us</span> US · <span className="font-mono">gb</span> UK
              </p>
            </div>
          </div>
        )}

        {err && (
          <div className="rounded-md border border-hairline bg-surface-3 px-3 py-2 text-caption text-ink-muted">
            {err}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={add}
            disabled={adding || query.trim().length === 0}
          >
            {adding && <Loader2 className="h-4 w-4 animate-spin" />}
            <Plus className="h-4 w-4" />
            Add saved search
          </Button>
        </div>
      </div>

      <p className="mt-3 text-caption text-ink-tertiary">
        Adzuna requires <code className="font-mono">ADZUNA_APP_ID</code> +{" "}
        <code className="font-mono">ADZUNA_APP_KEY</code> in <code className="font-mono">.env.local</code>{" "}
        (free at{" "}
        <a
          href="https://developer.adzuna.com/"
          target="_blank"
          rel="noreferrer noopener"
          className="text-primary hover:underline"
        >
          developer.adzuna.com
        </a>
        ). Greenhouse and Lever need no key.
      </p>
    </section>
  );
}

function CleanupSection() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{
    rejectedDeleted: number;
    inboxFilteredOut: number;
    inboxKept: number;
  } | null>(null);

  async function run() {
    if (
      !confirm(
        "This will permanently delete everything in the Rejected column and remove any Inbox roles that don't match the current filter. Continue?"
      )
    )
      return;
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/cleanup", { method: "POST" });
      const data = await res.json();
      if (data.ok) setResult(data);
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="rounded-lg border border-hairline bg-surface-1 p-6 edge-highlight">
      <h2 className="text-card-title text-ink">Housekeeping</h2>
      <p className="mt-1 text-body-sm text-ink-subtle">
        Clears every card from the Rejected column and re-applies the current
        filter to Inbox, deleting anything that no longer matches.
      </p>
      <div className="mt-4 flex items-center gap-3">
        <Button variant="secondary" size="md" onClick={run} disabled={running}>
          {running ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          {running ? "Cleaning…" : "Clean up now"}
        </Button>
        {result && (
          <span className="text-caption text-ink-muted">
            Removed {result.rejectedDeleted} rejected ·{" "}
            {result.inboxFilteredOut} inbox filtered out ·{" "}
            {result.inboxKept} inbox kept
          </span>
        )}
      </div>
    </section>
  );
}

function BookmarkletSection() {
  // The bookmarklet payload: grabs the page URL + body text and opens our /inbox endpoint.
  const bookmarkletCode = `javascript:(function(){var u=encodeURIComponent(location.href);var t=encodeURIComponent(document.body.innerText.replace(/\\s+/g,' ').slice(0,15000));window.open('http://localhost:3000/inbox?url='+u+'&text='+t,'_blank');})();`;

  return (
    <section className="rounded-lg border border-hairline bg-surface-1 p-6 edge-highlight">
      <h2 className="text-card-title text-ink">Bookmarklet — one-click save from any job site</h2>
      <p className="mt-1 text-body-sm text-ink-subtle">
        Drag the button below to your browser&apos;s bookmarks bar. Then on any LinkedIn / Indeed /
        company careers page, click it — the job gets saved to your Inbox with a fit score.
      </p>

      <div className="mt-5 flex items-center gap-3">
        <a
          href={bookmarkletCode}
          onClick={(e) => e.preventDefault()}
          draggable
          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-button text-on-primary hover:bg-primary-hover cursor-grab active:cursor-grabbing select-none"
        >
          <Bookmark className="h-4 w-4" />
          Save to Copilot
        </a>
        <span className="text-caption text-ink-tertiary">← drag this to your bookmarks bar</span>
      </div>

      <ol className="mt-5 list-decimal pl-5 text-body-sm text-ink-muted space-y-1.5">
        <li>
          Make sure your bookmarks bar is visible (Chrome:{" "}
          <kbd className="font-mono text-[12px] bg-surface-2 px-1.5 py-0.5 rounded">Ctrl+Shift+B</kbd>).
        </li>
        <li>Click the lavender button above and drag it to your bookmarks bar. Release.</li>
        <li>Go to any job posting in your browser.</li>
        <li>Click the bookmark — a tab opens, says &quot;Saved to Inbox&quot;, then closes itself.</li>
      </ol>

      <p className="mt-4 text-caption text-ink-tertiary">
        The bookmarklet only works while this app is running at{" "}
        <code className="font-mono">http://localhost:3000</code>.
      </p>
    </section>
  );
}

function DigestCard() {
  const [status, setStatus] = useState<{
    providerName: string | null;
    providerConfigured: boolean;
    last: { sentAt: string; jobCount: number; recipient: string; status: string; errorMsg: string | null } | null;
  } | null>(null);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const r = await fetch("/api/digest").then((r) => r.json());
    setStatus(r);
  }

  useEffect(() => {
    void load();
  }, []);

  async function sendNow() {
    setSending(true);
    setMsg(null);
    const res = await fetch("/api/digest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force: true }),
    });
    const data = await res.json();
    setSending(false);
    if (data.ok) {
      setMsg(`Sent to ${data.recipient} · ${data.jobCount} roles`);
    } else {
      setMsg(data.error || data.reason || "Failed");
    }
    await load();
  }

  const configured = status?.providerConfigured ?? false;

  return (
    <section className="rounded-lg border border-hairline bg-surface-1 p-6 edge-highlight">
      <div className="flex items-start gap-3">
        <div className="rounded-md border border-hairline bg-surface-2 p-2 text-ink-subtle">
          <Mail className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-card-title text-ink">Daily digest email</h2>
          <p className="mt-1 text-body-sm text-ink-subtle">
            The top 5 new roles emailed to you every morning at 8 AM. Catches up
            automatically if your laptop was asleep.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3 text-body-sm">
        <Row label="Provider">
          {configured ? (
            <span className="inline-flex items-center gap-1.5 text-success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {status?.providerName} configured
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[#f5a623]">
              <AlertTriangle className="h-3.5 w-3.5" />
              Set <code className="font-mono text-[12px] mx-1">RESEND_API_KEY</code> in <code className="font-mono text-[12px] mx-1">.env.local</code>
            </span>
          )}
        </Row>
        <Row label="Last sent">
          {status?.last ? (
            <span className="text-ink-muted">
              {new Date(status.last.sentAt).toLocaleString()} · {status.last.jobCount} roles · <span className={status.last.status === "OK" ? "text-success" : "text-[#e5484d]"}>{status.last.status}</span>
            </span>
          ) : (
            <span className="text-ink-tertiary">Never</span>
          )}
        </Row>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <Button variant="primary" onClick={sendNow} disabled={!configured || sending}>
          {sending && <Loader2 className="h-4 w-4 animate-spin" />}
          {sending ? "Sending…" : "Send digest now"}
        </Button>
        {msg && (
          <span className="text-caption text-ink-muted">{msg}</span>
        )}
      </div>
    </section>
  );
}

function GmailSyncCard() {
  const [status, setStatus] = useState<{
    configured: boolean;
    connected: boolean;
    lastPolledAt: string | null;
    unresolved: number;
  } | null>(null);
  const [polling, setPolling] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const r = await fetch("/api/gmail/status").then((r) => r.json()).catch(() => null);
    setStatus(r);
  }

  useEffect(() => {
    void load();
  }, []);

  async function pollNow() {
    setPolling(true);
    setMsg(null);
    const res = await fetch("/api/suggestions/poll", { method: "POST" });
    const data = await res.json();
    setPolling(false);
    if (data.ok) {
      setMsg(`Polled · ${data.inserted ?? 0} new suggestions`);
    } else {
      setMsg(data.error || "Poll failed");
    }
    await load();
  }

  async function disconnect() {
    if (!confirm("Disconnect Gmail? Existing suggestions will remain on the board.")) return;
    await fetch("/api/gmail/disconnect", { method: "POST" });
    await load();
  }

  return (
    <section className="rounded-lg border border-hairline bg-surface-1 p-6 edge-highlight">
      <div className="flex items-start gap-3">
        <div className="rounded-md border border-hairline bg-surface-2 p-2 text-ink-subtle">
          <Inbox className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-card-title text-ink">Gmail sync</h2>
          <p className="mt-1 text-body-sm text-ink-subtle">
            Read-only scan of your inbox. Detects interview invites, rejections, and offers,
            then <em>suggests</em> status moves. You always confirm — no silent changes.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3 text-body-sm">
        <Row label="OAuth keys">
          {status?.configured ? (
            <span className="inline-flex items-center gap-1.5 text-success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Configured
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[#f5a623]">
              <AlertTriangle className="h-3.5 w-3.5" />
              Set <code className="font-mono text-[12px] mx-1">GMAIL_CLIENT_ID</code>/<code className="font-mono text-[12px] mx-1">SECRET</code> in <code className="font-mono text-[12px] mx-1">.env.local</code>
            </span>
          )}
        </Row>
        <Row label="Connection">
          {status?.connected ? (
            <span className="text-success inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Connected
            </span>
          ) : (
            <span className="text-ink-tertiary">Not connected</span>
          )}
        </Row>
        <Row label="Last poll">
          <span className="text-ink-muted">
            {status?.lastPolledAt ? new Date(status.lastPolledAt).toLocaleString() : "Never"}
          </span>
        </Row>
        <Row label="Unresolved suggestions">
          <span className="text-ink-muted">{status?.unresolved ?? 0}</span>
        </Row>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {status?.connected ? (
          <>
            <Button variant="primary" onClick={pollNow} disabled={polling}>
              {polling && <Loader2 className="h-4 w-4 animate-spin" />}
              {polling ? "Polling…" : "Poll now"}
            </Button>
            <Button variant="ghost" onClick={disconnect}>
              Disconnect
            </Button>
          </>
        ) : (
          <a
            href="/api/gmail/connect"
            className={`inline-flex h-9 items-center justify-center rounded-md px-4 text-button transition-colors ${
              status?.configured
                ? "bg-primary text-on-primary hover:bg-primary-hover"
                : "border border-hairline bg-surface-2 text-ink-tertiary cursor-not-allowed pointer-events-none"
            }`}
          >
            Connect Gmail
          </a>
        )}
        {msg && <span className="text-caption text-ink-muted">{msg}</span>}
      </div>

      <details className="mt-4 text-caption text-ink-tertiary">
        <summary className="cursor-pointer hover:text-ink-subtle">Setup steps</summary>
        <ol className="mt-2 ml-4 list-decimal space-y-1">
          <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="underline">console.cloud.google.com</a> and create a project.</li>
          <li>Enable the Gmail API.</li>
          <li>OAuth consent screen → External → fill in basics.</li>
          <li>Credentials → Create OAuth client ID → Web application → add redirect URI <code className="font-mono">http://localhost:3000/api/gmail/callback</code>.</li>
          <li>Copy Client ID + Secret into <code className="font-mono">.env.local</code>, restart, click Connect.</li>
        </ol>
      </details>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3">
      <div className="w-44 flex-none text-caption text-ink-tertiary">{label}</div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
