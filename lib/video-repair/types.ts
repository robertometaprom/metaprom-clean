export const VIDEO_REPAIR_STRATEGIES = [
  "cut_if_safe",
  "crossfade_bridge",
  "hold_and_bridge",
  "editorial_cutaway",
] as const;

export type VideoRepairStrategy = (typeof VIDEO_REPAIR_STRATEGIES)[number];

/** Default authorized defect window. Future Inspector may override per request. */
export const DEFAULT_MAX_REPAIR_SECONDS = 1;

/** Hard ceiling on configurable maxRepairSeconds. Refuses absurd whole-clip rewrites. */
export const ABSURD_MAX_REPAIR_SECONDS = 8;

export const DEFAULT_HOLD_FADE_SECONDS = 0.12;

/** Default dissolve into/out of an editorial cutaway. Two frames at 24 fps. */
export const DEFAULT_CUTAWAY_FADE_SECONDS = 2 / 24;

export const DEFAULT_CUTAWAY_ZOOM_START = 1;
export const DEFAULT_CUTAWAY_ZOOM_END = 1.06;

export const VIDEO_REPAIR_ERROR_CODES = [
  "invalid_timestamps",
  "interval_too_small",
  "interval_outside_duration",
  "interval_exceeds_maximum",
  "strategy_unsuitable",
  "source_unresolved",
  "ffmpeg_unavailable",
  "ffmpeg_failed",
  "probe_failed",
] as const;

export type VideoRepairErrorCode = (typeof VIDEO_REPAIR_ERROR_CODES)[number];

export type EditorialCutawayCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Deterministic product/broth cutaway. Still must come from clean pixels
 * already present in the same video, outside the defect interval.
 */
export type EditorialCutawaySpec = {
  sourceSeconds: number;
  crop?: EditorialCutawayCrop;
  zoomStart?: number;
  zoomEnd?: number;
  fadeSeconds?: number;
};

export type VideoRepairRequest = {
  inputBuffer?: Buffer;
  /**
   * Explicit current source path. Required unless inputBuffer is provided.
   * Callers must select the latest valid asset; do not silently fall back to a
   * historically named "final" file.
   */
  inputPath?: string;
  startSeconds: number;
  endSeconds: number;
  strategy: VideoRepairStrategy;
  preserveDuration: boolean;
  maxRepairSeconds?: number;
  /** HOLD_AND_BRIDGE fade into post-defect frames. Ignored by other strategies. */
  holdFadeSeconds?: number;
  cutaway?: EditorialCutawaySpec;
  /** libx264 preset. Default fast preserves R1 encode behavior. */
  x264Preset?: string;
};

export type VideoRepairDiagnostics = {
  ffmpegArgs: string[];
  filterGraph: string;
  fps: number;
  width: number;
  height: number;
  hasAudio: boolean;
  preserveDuration: boolean;
  requestedStartSeconds: number;
  requestedEndSeconds: number;
  maxRepairSeconds: number;
  holdFadeSeconds?: number;
  cutawaySourceSeconds?: number;
  cutawayDurationSeconds?: number;
  cutawayFadeSeconds?: number;
};

export type VideoRepairResult = {
  buffer: Buffer;
  repaired: boolean;
  strategyUsed: VideoRepairStrategy;
  originalDurationSeconds: number;
  repairedDurationSeconds: number;
  removedDurationSeconds: number;
  reencodedVideo: boolean;
  diagnostics: VideoRepairDiagnostics;
};

export type MediaProbe = {
  durationSeconds: number;
  width: number;
  height: number;
  fps: number;
  hasVideo: boolean;
  hasAudio: boolean;
};

export class VideoRepairError extends Error {
  readonly code: VideoRepairErrorCode;
  readonly details: Record<string, unknown> | undefined;

  constructor(
    code: VideoRepairErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "VideoRepairError";
    this.code = code;
    this.details = details;
  }
}
