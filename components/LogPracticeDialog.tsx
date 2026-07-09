"use client";

import { useEffect, useState } from "react";
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
import type { SkillDTO } from "@/lib/types";

export function LogPracticeDialog({
  open,
  onOpenChange,
  skills,
  initialSkillId,
  onLogged,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  skills: SkillDTO[];
  initialSkillId: string | null;
  onLogged: () => void | Promise<void>;
}) {
  const [skillId, setSkillId] = useState<string>(initialSkillId ?? skills[0]?.id ?? "");
  const [hours, setHours] = useState<string>("1");
  const [note, setNote] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSkillId(initialSkillId ?? skills[0]?.id ?? "");
      setHours("1");
      setNote("");
      setError(null);
    }
  }, [open, initialSkillId, skills]);

  async function submit() {
    const h = parseFloat(hours);
    if (!skillId || !Number.isFinite(h) || h <= 0) {
      setError("Pick a skill and enter a positive number of hours.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/skills/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId, hours: h, note: note.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save.");
        return;
      }
      onOpenChange(false);
      await onLogged();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log practice</DialogTitle>
          <DialogDescription>
            Track an hour you actually spent on a skill. Diminishing returns kick in as you level up
            — every hour on a low-level skill moves the bar more than one on a maxed-out skill.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-caption text-ink-subtle">Skill</span>
            <select
              value={skillId}
              onChange={(e) => setSkillId(e.target.value)}
              className="h-9 w-full rounded-md border border-hairline bg-surface-1 px-3 text-body text-ink"
            >
              {skills.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — level {s.currentLevel.toFixed(1)} / {s.marketDemand}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-caption text-ink-subtle">Hours (0.25–24)</span>
            <Input
              type="number"
              min="0.25"
              max="24"
              step="0.25"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-caption text-ink-subtle">Note (optional)</span>
            <Textarea
              rows={2}
              placeholder='e.g. "finished Mode SQL chapter 3"'
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
            />
          </label>
          {error ? <p className="text-caption text-red-400">{error}</p> : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log it"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
