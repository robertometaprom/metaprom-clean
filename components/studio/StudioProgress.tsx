"use client";

import {
  STUDIO_LONG_WAIT_COPY,
  type StudioProgressStatus,
} from "@/lib/studio-progress";

type StudioProgressProps = {
  label: string;
  stage: string;
  progress: number;
  status?: StudioProgressStatus;
  longWait?: boolean;
  /** Tighter layout for inline finalization under result CTAs. */
  compact?: boolean;
};

/**
 * Compact estimated-progress UI for long-running Studio operations.
 * Presentation-only — does not drive billing or generation.
 */
export default function StudioProgress({
  label,
  stage,
  progress,
  status = "running",
  longWait = false,
  compact = false,
}: StudioProgressProps) {
  const clamped = Math.max(0, Math.min(100, Math.floor(progress)));
  const stageCopy =
    longWait && status === "running" ? STUDIO_LONG_WAIT_COPY : stage;

  return (
    <div
      className={`w-full max-w-md ${compact ? "space-y-2" : "space-y-3"}`}
      role="status"
      aria-live="polite"
      aria-busy={status === "running"}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p
          className={`font-semibold text-neutral-900 ${
            compact ? "text-sm" : "text-base sm:text-lg"
          }`}
        >
          {label}
        </p>
        <p
          className={`shrink-0 tabular-nums font-semibold text-violet-600 ${
            compact ? "text-sm" : "text-base"
          }`}
        >
          {clamped}%
        </p>
      </div>

      <div className="relative h-2 overflow-hidden rounded-full bg-neutral-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-600 transition-[width] duration-300 ease-out"
          style={{ width: `${clamped}%` }}
        />
        {status === "running" ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/35 to-transparent"
          />
        ) : null}
      </div>

      <p
        className={`text-neutral-500 ${compact ? "text-xs" : "text-sm"} ${
          longWait && status === "running" ? "text-neutral-600" : ""
        }`}
      >
        {stageCopy}
      </p>
    </div>
  );
}
