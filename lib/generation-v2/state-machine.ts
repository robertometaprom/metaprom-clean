/**
 * Generation V2 state machine — allowed transitions + terminal rules.
 */

import type { GenerationJobStatus } from "./types";

const TERMINAL: ReadonlySet<GenerationJobStatus> = new Set(["ready", "failed"]);

/** Forward edges only. `failed` is reachable from any non-terminal. */
const TRANSITIONS: Record<GenerationJobStatus, readonly GenerationJobStatus[]> =
  {
    created: ["image_generating", "failed"],
    image_generating: ["image_ready", "failed"],
    image_ready: ["video_generating", "failed"],
    video_generating: ["video_ready", "failed"],
    video_ready: ["persisting", "failed"],
    persisting: ["ready", "failed"],
    ready: [],
    failed: [],
  };

export function isTerminalStatus(status: GenerationJobStatus): boolean {
  return TERMINAL.has(status);
}

export function canTransition(
  from: GenerationJobStatus,
  to: GenerationJobStatus,
): boolean {
  if (from === to) return false;
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(
  from: GenerationJobStatus,
  to: GenerationJobStatus,
): void {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal generation_jobs transition: ${from} → ${to}`);
  }
}

export function nextStageAfterSuccess(
  status: GenerationJobStatus,
): GenerationJobStatus | null {
  switch (status) {
    case "created":
      return "image_generating";
    case "image_generating":
      return "image_ready";
    case "image_ready":
      return "video_generating";
    case "video_generating":
      return "video_ready";
    case "video_ready":
      return "persisting";
    case "persisting":
      return "ready";
    default:
      return null;
  }
}

export const GENERATION_JOB_STATUSES: readonly GenerationJobStatus[] = [
  "created",
  "image_generating",
  "image_ready",
  "video_generating",
  "video_ready",
  "persisting",
  "ready",
  "failed",
];
