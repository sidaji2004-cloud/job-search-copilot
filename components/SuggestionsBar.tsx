"use client";

import { useCallback, useEffect, useState } from "react";
import { Inbox, Calendar, XCircle, CheckCircle2, X } from "lucide-react";
import { STATUS_LABEL, type Status } from "@/lib/types";
import { cn } from "@/lib/cn";

type SuggestionDTO = {
  id: string;
  externalId: string;
  provider: string;
  subject: string;
  fromAddress: string;
  classification: "INTERVIEW_INVITE" | "REJECTION" | "OFFER" | "CONFIRMATION" | "OTHER";
  suggestedStatus: Status | null;
  confidence: number | null;
  receivedAt: string;
  jobId: string | null;
  job: { id: string; title: string; company: string; status: Status } | null;
};

const ICON_FOR: Record<string, React.ReactNode> = {
  INTERVIEW_INVITE: <Calendar className="h-3.5 w-3.5 text-primary" />,
  REJECTION: <XCircle className="h-3.5 w-3.5 text-[#e5484d]" />,
  OFFER: <CheckCircle2 className="h-3.5 w-3.5 text-success" />,
  CONFIRMATION: <Inbox className="h-3.5 w-3.5 text-ink-tertiary" />,
  OTHER: <Inbox className="h-3.5 w-3.5 text-ink-tertiary" />,
};

const LABEL_FOR: Record<string, string> = {
  INTERVIEW_INVITE: "Interview invite",
  REJECTION: "Rejection",
  OFFER: "Offer",
  CONFIRMATION: "Application received",
  OTHER: "Other",
};

export function SuggestionsBar({ onChange }: { onChange?: () => void }) {
  const [suggestions, setSuggestions] = useState<SuggestionDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/suggestions");
      if (!res.ok) return;
      const data = (await res.json()) as { suggestions: SuggestionDTO[] };
      setSuggestions(data.suggestions);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    // Re-load every minute so newly arrived suggestions appear without refresh.
    const id = setInterval(() => void load(), 60_000);
    return () => clearInterval(id);
  }, [load]);

  async function moveJob(s: SuggestionDTO) {
    if (!s.job || !s.suggestedStatus) return;
    await fetch(`/api/jobs/${s.job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: s.suggestedStatus }),
    });
    await resolve(s.id);
    onChange?.();
  }

  async function resolve(id: string) {
    await fetch(`/api/suggestions?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolved: true }),
    });
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  }

  if (loading || suggestions.length === 0) return null;

  return (
    <div className="mb-4 mx-2 rounded-md border border-hairline bg-surface-1 edge-highlight overflow-hidden">
      <div className="flex items-center justify-between border-b border-hairline px-4 py-2">
        <div className="flex items-center gap-2">
          <Inbox className="h-3.5 w-3.5 text-ink-subtle" />
          <span className="text-eyebrow uppercase text-ink-subtle">
            Inbox notifications · {suggestions.length}
          </span>
        </div>
      </div>
      <div className="divide-y divide-hairline">
        {suggestions.slice(0, 5).map((s) => (
          <Row key={s.id} s={s} onMove={() => moveJob(s)} onDismiss={() => resolve(s.id)} />
        ))}
      </div>
    </div>
  );
}

function Row({
  s,
  onMove,
  onDismiss,
}: {
  s: SuggestionDTO;
  onMove: () => void;
  onDismiss: () => void;
}) {
  const canMove = Boolean(s.job && s.suggestedStatus);
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <div className="min-w-0 flex-1 flex items-center gap-2.5">
        <span className="flex-none">{ICON_FOR[s.classification]}</span>
        <div className="min-w-0">
          <div className="text-body-sm text-ink truncate">
            {s.job ? (
              <>
                <span className="font-medium">{s.job.company}</span>
                <span className="text-ink-subtle"> · {LABEL_FOR[s.classification]}</span>
              </>
            ) : (
              <span className="text-ink-subtle">
                {LABEL_FOR[s.classification]} from{" "}
                <span className="text-ink">{shortenSender(s.fromAddress)}</span> (no matching card)
              </span>
            )}
          </div>
          <div className="text-caption text-ink-tertiary truncate">{s.subject}</div>
        </div>
      </div>
      <div className="flex-none flex items-center gap-1">
        {canMove && (
          <button
            type="button"
            onClick={onMove}
            className={cn(
              "rounded-md border border-hairline bg-surface-2 px-2 py-1 text-caption text-ink-muted",
              "hover:text-ink hover:border-hairline-strong transition-colors"
            )}
          >
            Move to {STATUS_LABEL[s.suggestedStatus!]}
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md p-1 text-ink-tertiary hover:text-ink-subtle transition-colors"
          aria-label="Dismiss suggestion"
          title="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function shortenSender(from: string): string {
  // "Razorpay Careers <noreply@razorpay.com>" → "Razorpay Careers"
  const m = from.match(/^([^<]+)</);
  return (m ? m[1] : from).trim().slice(0, 60);
}
