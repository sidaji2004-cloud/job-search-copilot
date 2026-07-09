"use client";

import { useEffect, useState } from "react";
import { Copy, Loader2, RefreshCw, Sparkles, FileText, FileType2, Zap } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "./ui/Button";
import {
  KINDS,
  KIND_LABEL,
  KIND_DESCRIPTION,
  type GenerationDTO,
  type JobDTO,
  type Kind,
} from "@/lib/types";
import { cn } from "@/lib/cn";

export function KitPanel({ job }: { job: JobDTO }) {
  const [generations, setGenerations] = useState<Record<Kind, GenerationDTO | undefined>>({
    COVER_LETTER: undefined,
    RESUME_BULLETS: undefined,
    INTERVIEW_QUESTIONS: undefined,
    COMPANY_BRIEF: undefined,
  });
  const [loadingKind, setLoadingKind] = useState<Kind | null>(null);
  const [loadingAll, setLoadingAll] = useState(false);
  const [activeKind, setActiveKind] = useState<Kind | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch(`/api/jobs/${job.id}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { job: JobDTO & { generations: GenerationDTO[] } };
      if (cancelled) return;
      const map: Record<Kind, GenerationDTO | undefined> = {
        COVER_LETTER: undefined,
        RESUME_BULLETS: undefined,
        INTERVIEW_QUESTIONS: undefined,
        COMPANY_BRIEF: undefined,
      };
      for (const g of data.job.generations) {
        if ((KINDS as readonly string[]).includes(g.kind)) {
          map[g.kind as Kind] = g;
        }
      }
      setGenerations(map);
      const firstExisting = KINDS.find((k) => map[k]);
      if (firstExisting) setActiveKind(firstExisting);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [job.id]);

  async function generate(kind: Kind) {
    setLoadingKind(kind);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${job.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Generation failed.");
        return;
      }
      setGenerations((g) => ({ ...g, [kind]: data.generation }));
      setActiveKind(kind);
    } finally {
      setLoadingKind(null);
    }
  }

  async function generateAll() {
    setLoadingAll(true);
    setError(null);
    try {
      const results = await Promise.all(
        KINDS.map((kind) =>
          fetch(`/api/jobs/${job.id}/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind }),
          })
            .then((r) => r.json())
            .then((d) => ({ kind, data: d }))
            .catch((e) => ({ kind, data: { error: e instanceof Error ? e.message : String(e) } }))
        )
      );
      const next = { ...generations };
      let firstFail: string | null = null;
      for (const r of results) {
        if (r.data?.generation) next[r.kind] = r.data.generation;
        else if (!firstFail) firstFail = r.data?.error || `Failed: ${r.kind}`;
      }
      setGenerations(next);
      if (firstFail) setError(firstFail);
      const firstExisting = KINDS.find((k) => next[k]);
      if (firstExisting) setActiveKind(firstExisting);
    } finally {
      setLoadingAll(false);
    }
  }

  const active = activeKind ? generations[activeKind] : undefined;

  const anyExists = KINDS.some((k) => generations[k]);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-caption text-ink-tertiary">
          Generate one kit at a time, or do all four together.
        </p>
        <Button
          variant="primary"
          size="sm"
          onClick={generateAll}
          disabled={loadingAll || loadingKind !== null}
        >
          {loadingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
          {loadingAll ? "Generating all…" : anyExists ? "Regenerate everything" : "Generate everything"}
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-hairline px-4 py-2 text-caption text-ink-muted">
          {error}
        </div>
      )}

      {/* Four generator tiles — always visible, no scroll needed */}
      <div className="grid grid-cols-2 gap-3">
        {KINDS.map((kind) => (
          <KitTile
            key={kind}
            kind={kind}
            generation={generations[kind]}
            loading={loadingKind === kind}
            isActive={activeKind === kind}
            onSelect={() => generations[kind] && setActiveKind(kind)}
            onGenerate={() => generate(kind)}
          />
        ))}
      </div>

      {/* Result area below the tiles */}
      {active && (
        <div className="rounded-lg border border-hairline bg-surface-1 edge-highlight">
          <ResultView
            jobId={job.id}
            kind={active.kind as Kind}
            generation={active}
            onRegenerate={() => generate(active.kind as Kind)}
            regenerating={loadingKind === active.kind}
          />
        </div>
      )}
      {!active && !error && <EmptyState />}
    </div>
  );
}

function KitTile({
  kind,
  generation,
  loading,
  isActive,
  onSelect,
  onGenerate,
}: {
  kind: Kind;
  generation?: GenerationDTO;
  loading: boolean;
  isActive: boolean;
  onSelect: () => void;
  onGenerate: () => void;
}) {
  const hasResult = Boolean(generation);
  return (
    <div
      className={cn(
        "rounded-lg border bg-surface-1 p-3 transition-colors edge-highlight",
        isActive ? "border-hairline-strong bg-surface-2" : "border-hairline",
        hasResult && "cursor-pointer hover:border-hairline-strong"
      )}
      onClick={hasResult ? onSelect : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-body-sm font-medium text-ink">{KIND_LABEL[kind]}</div>
          <div className="mt-0.5 text-caption text-ink-subtle line-clamp-2">
            {KIND_DESCRIPTION[kind]}
          </div>
        </div>
        {hasResult && (
          <span className="mt-0.5 inline-flex h-1.5 w-1.5 flex-none rounded-full bg-success" />
        )}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-caption text-ink-tertiary">
          {generation
            ? new Date(generation.createdAt).toLocaleDateString()
            : "Not generated"}
        </span>
        <Button
          size="sm"
          variant={hasResult ? "secondary" : "primary"}
          onClick={(e) => {
            e.stopPropagation();
            onGenerate();
          }}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : hasResult ? (
            <RefreshCw className="h-3.5 w-3.5" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {hasResult ? "Regenerate" : "Generate"}
        </Button>
      </div>
    </div>
  );
}

function ResultView({
  jobId,
  kind,
  generation,
  onRegenerate,
  regenerating,
}: {
  jobId: string;
  kind: Kind;
  generation: GenerationDTO;
  onRegenerate: () => void;
  regenerating: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(generation.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div>
      <div className="flex items-center justify-between border-b border-hairline px-5 py-3">
        <div>
          <div className="text-body-sm font-medium text-ink">{KIND_LABEL[kind]}</div>
          <div className="text-caption font-mono text-ink-tertiary">{generation.model}</div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="ghost" onClick={copy}>
            <Copy className="h-3.5 w-3.5" />
            {copied ? "Copied" : "Copy"}
          </Button>
          <a
            href={`/api/jobs/${jobId}/export?kind=${kind}&format=docx`}
            download
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-button text-ink-subtle hover:bg-surface-1 hover:text-ink transition-colors"
          >
            <FileType2 className="h-3.5 w-3.5" />
            .docx
          </a>
          <a
            href={`/api/jobs/${jobId}/export?kind=${kind}&format=pdf`}
            download
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-button text-ink-subtle hover:bg-surface-1 hover:text-ink transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
            .pdf
          </a>
          <Button size="sm" variant="ghost" onClick={onRegenerate} disabled={regenerating}>
            {regenerating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
      <div className="markdown-body px-5 py-4">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{generation.content}</ReactMarkdown>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full min-h-[280px] flex-col items-center justify-center px-6 py-10 text-center">
      <Sparkles className="h-6 w-6 text-ink-tertiary" />
      <p className="mt-3 text-body-sm text-ink-muted">No kit generated yet.</p>
      <p className="mt-1 max-w-sm text-caption text-ink-subtle">
        Pick a tile on the left and hit <strong className="text-ink">Generate</strong> to draft a
        cover letter, tailored resume bullets, interview questions, or a company brief.
      </p>
    </div>
  );
}
