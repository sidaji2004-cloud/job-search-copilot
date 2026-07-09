"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from "./ui/Dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/Tabs";
import { Button } from "./ui/Button";
import { Input, Textarea } from "./ui/Input";
import { KitPanel } from "./KitPanel";
import { STATUSES, STATUS_LABEL, type JobDTO, type Status } from "@/lib/types";
import { cn } from "@/lib/cn";

export function JobDetailDialog({
  job,
  onClose,
  onChange,
}: {
  job: JobDTO | null;
  onClose: () => void;
  onChange: () => void;
}) {
  const [local, setLocal] = useState<JobDTO | null>(job);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocal(job);
  }, [job]);

  if (!job || !local) return null;

  async function save(patch: Partial<JobDTO>) {
    if (!local) return;
    setSaving(true);
    const next = { ...local, ...patch };
    setLocal(next);
    await fetch(`/api/jobs/${local.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setSaving(false);
    onChange();
  }

  async function remove() {
    if (!local) return;
    if (!confirm("Delete this job and any generated kit?")) return;
    await fetch(`/api/jobs/${local.id}`, { method: "DELETE" });
    onClose();
    onChange();
  }

  return (
    <Dialog open={Boolean(job)} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4 pr-8">
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate">{local.title}</DialogTitle>
              <div className="mt-1 flex items-center gap-2 text-body-sm text-ink-subtle">
                <span>{local.company}</span>
                {local.location && (
                  <>
                    <span className="text-ink-tertiary">·</span>
                    <span>{local.location}</span>
                  </>
                )}
                {local.url && (
                  <a
                    href={local.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 text-ink-subtle hover:text-ink"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View posting
                  </a>
                )}
              </div>
            </div>
            <StatusSelect
              value={local.status}
              onChange={(s) => save({ status: s })}
              disabled={saving}
            />
          </div>
        </DialogHeader>

        <DialogBody className="overflow-y-auto flex-1 min-h-0">
          <Tabs defaultValue="kit">
            <TabsList>
              <TabsTrigger value="kit">Kit</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="kit">
              <KitPanel job={local} />
            </TabsContent>

            <TabsContent value="details">
              <div className="space-y-4">
                <Field label="Title">
                  <Input
                    value={local.title}
                    onChange={(e) => setLocal({ ...local, title: e.target.value })}
                    onBlur={() => save({ title: local.title })}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Company">
                    <Input
                      value={local.company}
                      onChange={(e) => setLocal({ ...local, company: e.target.value })}
                      onBlur={() => save({ company: local.company })}
                    />
                  </Field>
                  <Field label="Location">
                    <Input
                      value={local.location ?? ""}
                      onChange={(e) => setLocal({ ...local, location: e.target.value })}
                      onBlur={() => save({ location: local.location })}
                    />
                  </Field>
                </div>
                <Field label="URL">
                  <Input
                    value={local.url ?? ""}
                    placeholder="https://…"
                    onChange={(e) => setLocal({ ...local, url: e.target.value })}
                    onBlur={() => save({ url: local.url })}
                  />
                </Field>
                <Field label="Job description">
                  <Textarea
                    rows={10}
                    value={local.description}
                    onChange={(e) => setLocal({ ...local, description: e.target.value })}
                    onBlur={() => save({ description: local.description })}
                  />
                </Field>
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <Field label="Applied on">
                    <Input
                      type="date"
                      value={toDateInput(local.appliedAt)}
                      onChange={(e) => {
                        const v = e.target.value ? new Date(e.target.value).toISOString() : null;
                        setLocal({ ...local, appliedAt: v });
                        save({ appliedAt: v });
                      }}
                    />
                  </Field>
                  <Field label="Follow up on">
                    <Input
                      type="date"
                      value={toDateInput(local.followUpAt)}
                      onChange={(e) => {
                        const v = e.target.value ? new Date(e.target.value).toISOString() : null;
                        setLocal({ ...local, followUpAt: v });
                        save({ followUpAt: v });
                      }}
                    />
                  </Field>
                  <Field label="Interview on">
                    <Input
                      type="date"
                      value={toDateInput(local.interviewAt)}
                      onChange={(e) => {
                        const v = e.target.value ? new Date(e.target.value).toISOString() : null;
                        setLocal({ ...local, interviewAt: v });
                        save({ interviewAt: v });
                      }}
                    />
                  </Field>
                </div>
                <div className="pt-2 flex justify-between items-center">
                  <span className="text-caption text-ink-tertiary">
                    Updated {new Date(local.updatedAt).toLocaleString()}
                  </span>
                  <Button variant="danger" size="sm" onClick={remove}>
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete job
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notes">
              <Textarea
                rows={12}
                placeholder="Recruiter name, interview dates, follow-ups…"
                value={local.notes ?? ""}
                onChange={(e) => setLocal({ ...local, notes: e.target.value })}
                onBlur={() => save({ notes: local.notes })}
              />
            </TabsContent>
          </Tabs>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-caption text-ink-subtle">{label}</label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function StatusSelect({
  value,
  onChange,
  disabled,
}: {
  value: Status;
  onChange: (s: Status) => void;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Status)}
        disabled={disabled}
        className={cn(
          "h-8 appearance-none rounded-pill border border-hairline bg-surface-2 pl-3 pr-7 text-caption text-ink-muted",
          "focus:outline-none focus:ring-2 focus:ring-primary-focus/50"
        )}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s} className="bg-surface-1 text-ink">
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-subtle">
        ▾
      </span>
    </div>
  );
}
