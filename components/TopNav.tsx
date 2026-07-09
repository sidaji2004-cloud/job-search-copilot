"use client";

import Link from "next/link";
import { Settings, BarChart3, Target } from "lucide-react";

export function TopNav({ rightSlot }: { rightSlot?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 h-14 border-b border-hairline bg-canvas/90 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-container items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark />
          <span className="text-body-sm font-medium tracking-tight text-ink">
            Job Search Copilot
          </span>
        </Link>
        <div className="flex items-center gap-2">
          {rightSlot}
          <Link
            href="/skills"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-subtle transition-colors hover:bg-surface-1 hover:text-ink"
            aria-label="Skills"
            title="Skills"
          >
            <Target className="h-4 w-4" />
          </Link>
          <Link
            href="/stats"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-subtle transition-colors hover:bg-surface-1 hover:text-ink"
            aria-label="Stats"
            title="Stats"
          >
            <BarChart3 className="h-4 w-4" />
          </Link>
          <Link
            href="/settings"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-subtle transition-colors hover:bg-surface-1 hover:text-ink"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}

function BrandMark() {
  return (
    <div
      className="grid h-6 w-6 place-items-center rounded-md"
      style={{
        background:
          "linear-gradient(135deg, var(--primary) 0%, var(--primary-focus) 100%)",
      }}
    >
      <span className="font-mono text-[11px] font-semibold leading-none text-on-primary">JS</span>
    </div>
  );
}
