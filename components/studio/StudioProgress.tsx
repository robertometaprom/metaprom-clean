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
  /**
   * `director` — dark glass hierarchy beside Director artwork.
   * `light` — default compact Studio surfaces.
   */
  tone?: "light" | "director";
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
  tone = "light",
}: StudioProgressProps) {
  const clamped = Math.max(0, Math.min(100, Math.floor(progress)));
  const stageCopy =
    longWait && status === "running" ? STUDIO_LONG_WAIT_COPY : stage;

  if (tone === "director") {
    return (
      <div
        className="w-full space-y-4 text-left sm:space-y-5"
        role="status"
        aria-live="polite"
        aria-busy={status === "running"}
      >
        <p className="text-sm font-medium tracking-wide text-white/75 sm:text-base">
          {label}
        </p>

        <p className="text-6xl font-semibold tabular-nums tracking-tight text-white sm:text-7xl">
          {clamped}
          <span className="ml-1 text-3xl font-medium text-fuchsia-300/90 sm:text-4xl">
            %
          </span>
        </p>

        <div className="relative h-2.5 max-w-sm overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-300 transition-[width] duration-300 ease-out"
            style={{ width: `${clamped}%` }}
          />
          {status === "running" ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/25 to-transparent"
            />
          ) : null}
        </div>

        <p
          className={`max-w-md text-sm leading-relaxed text-white/70 sm:text-[15px] ${
            longWait && status === "running" ? "text-white/85" : ""
          }`}
        >
          {stageCopy}
        </p>
      </div>
    );
  }

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
