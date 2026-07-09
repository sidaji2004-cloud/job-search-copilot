"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

function InboxInner() {
  const params = useSearchParams();
  const [status, setStatus] = useState<"saving" | "saved" | "duplicate" | "error">("saving");
  const [error, setError] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState<string | null>(null);

  useEffect(() => {
    const url = params.get("url");
    const text = params.get("text");
    (async () => {
      try {
        const res = await fetch("/api/bookmarklet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, text }),
        });
        const data = await res.json();
        if (!res.ok) {
          setStatus("error");
          setError(data.error || "Failed to save.");
          return;
        }
        setJobTitle(data.job?.title ?? null);
        setStatus(data.duplicate ? "duplicate" : "saved");
        // Auto-close after success
        setTimeout(() => {
          try {
            window.close();
          } catch {
            /* some browsers block window.close on non-script-opened tabs */
          }
        }, 1800);
      } catch (e) {
        setStatus("error");
        setError(e instanceof Error ? e.message : "Network error.");
      }
    })();
  }, [params]);

  return (
    <div className="min-h-screen text-ink flex items-center justify-center px-6">
      <div className="rounded-lg border border-hairline bg-surface-1 edge-highlight px-8 py-7 max-w-md w-full text-center">
        {status === "saving" && (
          <>
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
            <h1 className="mt-4 text-card-title text-ink">Saving job…</h1>
            <p className="mt-1 text-body-sm text-ink-subtle">
              Reading the page, scoring the fit, dropping it into your Inbox.
            </p>
          </>
        )}
        {status === "saved" && (
          <>
            <CheckCircle2 className="mx-auto h-6 w-6 text-success" />
            <h1 className="mt-4 text-card-title text-ink">Saved to Inbox</h1>
            {jobTitle && <p className="mt-2 text-body-sm text-ink-muted">{jobTitle}</p>}
            <p className="mt-3 text-caption text-ink-tertiary">
              This tab will close automatically. If not, you can close it.
            </p>
          </>
        )}
        {status === "duplicate" && (
          <>
            <CheckCircle2 className="mx-auto h-6 w-6 text-ink-subtle" />
            <h1 className="mt-4 text-card-title text-ink">Already saved</h1>
            <p className="mt-1 text-body-sm text-ink-subtle">
              This job was already in your board.
            </p>
          </>
        )}
        {status === "error" && (
          <>
            <AlertTriangle className="mx-auto h-6 w-6 text-[#f5a623]" />
            <h1 className="mt-4 text-card-title text-ink">Couldn&apos;t save</h1>
            <p className="mt-2 text-body-sm text-ink-muted">{error}</p>
            <Link href="/" className="mt-4 inline-block text-body-sm text-primary hover:underline">
              Open board
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function InboxPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <InboxInner />
    </Suspense>
  );
}
