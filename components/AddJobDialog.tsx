"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "./ui/Dialog";
import { Button } from "./ui/Button";
import { Input, Textarea } from "./ui/Input";
import { cn } from "@/lib/cn";

type Mode = "url" | "text";

export function AddJobDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => Promise<void> | void;
}) {
  const [mode, setMode] = useState<Mode>("url");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setUrl("");
    setText("");
    setMode("url");
    setError(null);
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const body = mode === "url" ? { url: url.trim() } : { text: text.trim() };
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      reset();
      onOpenChange(false);
      await onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = mode === "url" ? url.trim().length > 0 : text.trim().length > 20;

  return (
    <Dialog open={open} onOpenChange={(v) => {
      onOpenChange(v);
      if (!v) reset();
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a job</DialogTitle>
          <DialogDescription>
            Paste a job posting URL — we&apos;ll fetch the page. If the site blocks scraping
            (e.g. LinkedIn), switch to <em>Text</em> and paste the description.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="mb-4 inline-flex rounded-md border border-hairline bg-surface-1 p-0.5">
            <ModeTab mode="url" active={mode} onSelect={setMode}>
              URL
            </ModeTab>
            <ModeTab mode="text" active={mode} onSelect={setMode}>
              Text
            </ModeTab>
          </div>

          {mode === "url" ? (
            <div>
              <label className="text-caption text-ink-subtle">Job posting URL</label>
              <Input
                autoFocus
                placeholder="https://jobs.company.com/openings/123"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="mt-1.5"
              />
              <p className="mt-2 text-caption text-ink-tertiary">
                We&apos;ll auto-fill title, company, and location.
              </p>
            </div>
          ) : (
            <div>
              <label className="text-caption text-ink-subtle">Job description</label>
              <Textarea
                autoFocus
                rows={10}
                placeholder="Paste the full job description here…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="mt-1.5"
              />
              <p className="mt-2 text-caption text-ink-tertiary">
                Tip: include the role title and company name in the first few lines.
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-md border border-hairline bg-surface-2 px-3 py-2 text-caption text-ink-muted">
              {error}
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="tertiary" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={!canSubmit || submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Adding…" : "Add job"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ModeTab({
  mode,
  active,
  onSelect,
  children,
}: {
  mode: Mode;
  active: Mode;
  onSelect: (m: Mode) => void;
  children: React.ReactNode;
}) {
  const isActive = active === mode;
  return (
    <button
      onClick={() => onSelect(mode)}
      className={cn(
        "h-7 rounded-sm px-3 text-body-sm font-medium transition-colors",
        isActive ? "bg-surface-2 text-ink" : "text-ink-subtle hover:text-ink"
      )}
      type="button"
    >
      {children}
    </button>
  );
}
