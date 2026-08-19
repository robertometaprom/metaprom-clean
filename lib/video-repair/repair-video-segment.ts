import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import {
  extractCutawayStill,
  probeMedia,
  resolveFfmpegBinary,
  runFfmpeg,
  FfmpegRunError,
} from "./ffmpeg";
import { resolveCurrentSourceAsset } from "./source-asset";
import {
  ABSURD_MAX_REPAIR_SECONDS,
  DEFAULT_CUTAWAY_FADE_SECONDS,
  DEFAULT_CUTAWAY_ZOOM_END,
  DEFAULT_CUTAWAY_ZOOM_START,
  DEFAULT_HOLD_FADE_SECONDS,
  DEFAULT_MAX_REPAIR_SECONDS,
  VIDEO_REPAIR_STRATEGIES,
  VideoRepairError,
  type EditorialCutawaySpec,
  type MediaProbe,
  type VideoRepairDiagnostics,
  type VideoRepairRequest,
  type VideoRepairResult,
  type VideoRepairStrategy,
} from "./types";

const MIN_INTERVAL_SECONDS = 1 / 24;
const DURATION_EPSILON_SECONDS = 0.05;

export type RepairCommandPlan = {
  args: string[];
  filterGraph: string;
  reencodedVideo: true;
};

function formatSeconds(value: number): string {
  return (Math.round(value * 1e6) / 1e6).toString();
}

function isStrategy(value: string): value is VideoRepairStrategy {
  return (VIDEO_REPAIR_STRATEGIES as readonly string[]).includes(value);
}

export function validateRepairTimestamps(
  request: Pick<VideoRepairRequest, "startSeconds" | "endSeconds" | "strategy" | "maxRepairSeconds">,
): { startSeconds: number; endSeconds: number; intervalSeconds: number; maxRepairSeconds: number } {
  if (!isStrategy(request.strategy)) {
    throw new VideoRepairError(
      "strategy_unsuitable",
      `Unknown repair strategy: ${String(request.strategy)}`,
    );
  }

  const startSeconds = request.startSeconds;
  const endSeconds = request.endSeconds;
  if (
    !Number.isFinite(startSeconds) ||
    !Number.isFinite(endSeconds)
  ) {
    throw new VideoRepairError(
      "invalid_timestamps",
      "Repair timestamps must be finite numbers.",
      { startSeconds, endSeconds },
    );
  }

  if (startSeconds < 0 || endSeconds < 0) {
    throw new VideoRepairError(
      "invalid_timestamps",
      "Repair timestamps cannot be negative.",
      { startSeconds, endSeconds },
    );
  }

  if (startSeconds >= endSeconds) {
    throw new VideoRepairError(
      "invalid_timestamps",
      "Repair startSeconds must be less than endSeconds.",
      { startSeconds, endSeconds },
    );
  }

  const intervalSeconds = endSeconds - startSeconds;
  if (intervalSeconds <= 0 || intervalSeconds < MIN_INTERVAL_SECONDS) {
    throw new VideoRepairError(
      "interval_too_small",
      "Repair interval must be greater than one frame.",
      { intervalSeconds },
    );
  }

  const maxRepairSeconds = request.maxRepairSeconds ?? DEFAULT_MAX_REPAIR_SECONDS;
  if (!Number.isFinite(maxRepairSeconds) || maxRepairSeconds <= 0) {
    throw new VideoRepairError(
      "interval_exceeds_maximum",
      "maxRepairSeconds must be a positive finite number.",
      { maxRepairSeconds },
    );
  }
  if (maxRepairSeconds > ABSURD_MAX_REPAIR_SECONDS) {
    throw new VideoRepairError(
      "interval_exceeds_maximum",
      `maxRepairSeconds exceeds the ${ABSURD_MAX_REPAIR_SECONDS}s hard ceiling.`,
      { maxRepairSeconds },
    );
  }
  if (intervalSeconds > maxRepairSeconds + 1e-9) {
    throw new VideoRepairError(
      "interval_exceeds_maximum",
      "Requested defect window exceeds the configured maximum repair duration.",
      { intervalSeconds, maxRepairSeconds },
    );
  }

  return { startSeconds, endSeconds, intervalSeconds, maxRepairSeconds };
}

export function assertRepairFitsMedia(
  request: Pick<
    VideoRepairRequest,
    "startSeconds" | "endSeconds" | "strategy" | "preserveDuration" | "cutaway"
  >,
  probe: MediaProbe,
): void {
  const { durationSeconds, fps } = probe;
  const startSeconds = request.startSeconds;
  const endSeconds = request.endSeconds;

  if (startSeconds >= durationSeconds - 1e-9) {
    throw new VideoRepairError(
      "interval_outside_duration",
      "Repair start is outside the media duration.",
      { startSeconds, durationSeconds },
    );
  }

  if (endSeconds > durationSeconds + DURATION_EPSILON_SECONDS) {
    throw new VideoRepairError(
      "interval_outside_duration",
      "Repair end is outside the media duration.",
      { endSeconds, durationSeconds },
    );
  }

  const clampedEnd = Math.min(endSeconds, durationSeconds);
  const edge = Math.max(2 / Math.max(fps, 1), 0.05);

  if (request.strategy === "cut_if_safe" && request.preserveDuration) {
    throw new VideoRepairError(
      "strategy_unsuitable",
      "cut_if_safe shortens the timeline and cannot preserve duration.",
      { strategy: request.strategy, preserveDuration: request.preserveDuration },
    );
  }

  if (request.strategy === "hold_and_bridge" && !request.preserveDuration) {
    throw new VideoRepairError(
      "strategy_unsuitable",
      "hold_and_bridge exists to cover the defect while preserving duration.",
      { strategy: request.strategy, preserveDuration: request.preserveDuration },
    );
  }

  if (request.strategy === "editorial_cutaway" && !request.preserveDuration) {
    throw new VideoRepairError(
      "strategy_unsuitable",
      "editorial_cutaway replaces defective frames in place and must preserve duration.",
      { strategy: request.strategy, preserveDuration: request.preserveDuration },
    );
  }

  if (
    probe.hasAudio &&
    !request.preserveDuration &&
    request.strategy === "crossfade_bridge"
  ) {
    throw new VideoRepairError(
      "strategy_unsuitable",
      "crossfade_bridge without preserveDuration would desync existing audio; use cut_if_safe on a silent master instead.",
      { strategy: request.strategy, preserveDuration: request.preserveDuration },
    );
  }

  if (request.strategy !== "cut_if_safe") {
    if (startSeconds < edge) {
      throw new VideoRepairError(
        "strategy_unsuitable",
        "Bridge strategies need a safe pre-defect frame before the interval.",
        { startSeconds, edgeSeconds: edge },
      );
    }
    if (durationSeconds - clampedEnd < edge) {
      throw new VideoRepairError(
        "strategy_unsuitable",
        "Bridge strategies need a safe post-defect frame after the interval.",
        { endSeconds: clampedEnd, durationSeconds, edgeSeconds: edge },
      );
    }
  }

  if (request.strategy === "editorial_cutaway") {
    assertEditorialCutawaySpec(request.cutaway, request.startSeconds, clampedEnd, probe);
  }
}

function holdFadeSecondsFor(
  request: VideoRepairRequest,
  intervalSeconds: number,
  fps: number,
): number {
  const requested = request.holdFadeSeconds ?? DEFAULT_HOLD_FADE_SECONDS;
  const minFade = 1 / Math.max(fps, 1);
  const maxFade = Math.max(minFade, intervalSeconds * 0.45);
  return Math.min(Math.max(requested, minFade), maxFade);
}

export function assertEditorialCutawaySpec(
  cutaway: EditorialCutawaySpec | undefined,
  startSeconds: number,
  endSeconds: number,
  probe: Pick<MediaProbe, "durationSeconds" | "width" | "height">,
): EditorialCutawaySpec {
  if (!cutaway || !Number.isFinite(cutaway.sourceSeconds)) {
    throw new VideoRepairError(
      "strategy_unsuitable",
      "editorial_cutaway requires a finite cutaway.sourceSeconds from clean footage.",
    );
  }

  const sourceSeconds = cutaway.sourceSeconds;
  if (sourceSeconds < 0 || sourceSeconds >= probe.durationSeconds) {
    throw new VideoRepairError(
      "strategy_unsuitable",
      "Cutaway still timestamp is outside the media duration.",
      { sourceSeconds, durationSeconds: probe.durationSeconds },
    );
  }

  if (sourceSeconds >= startSeconds - 1e-9 && sourceSeconds < endSeconds) {
    throw new VideoRepairError(
      "strategy_unsuitable",
      "Cutaway still must come from outside the defect interval.",
      { sourceSeconds, startSeconds, endSeconds },
    );
  }

  if (cutaway.crop) {
    const { x, y, width, height } = cutaway.crop;
    if (
      ![x, y, width, height].every(Number.isFinite) ||
      width < 2 ||
      height < 2 ||
      x < 0 ||
      y < 0 ||
      x + width > probe.width + 1e-6 ||
      y + height > probe.height + 1e-6
    ) {
      throw new VideoRepairError(
        "strategy_unsuitable",
        "Cutaway crop is outside the source frame.",
        { crop: cutaway.crop, width: probe.width, height: probe.height },
      );
    }
  }

  return cutaway;
}

export function cutawayFadeSecondsFor(
  request: Pick<VideoRepairRequest, "cutaway" | "startSeconds" | "endSeconds">,
  probe: Pick<MediaProbe, "durationSeconds" | "fps">,
): number {
  const requested = request.cutaway?.fadeSeconds ?? DEFAULT_CUTAWAY_FADE_SECONDS;
  if (!Number.isFinite(requested) || requested <= 0) {
    return 0;
  }

  const frame = 1 / Math.max(probe.fps, 1);
  const maxFade = Math.min(
    request.startSeconds - frame,
    probe.durationSeconds - request.endSeconds - frame,
    0.25,
  );
  if (maxFade < frame) {
    return 0;
  }

  return Math.min(Math.max(requested, frame), maxFade);
}

export function cutawayDurationSeconds(
  intervalSeconds: number,
  fadeSeconds: number,
): number {
  return intervalSeconds + (fadeSeconds > 0 ? 2 * fadeSeconds : 0);
}

export function buildRepairFfmpegArgs(input: {
  inputPath: string;
  outputPath: string;
  request: VideoRepairRequest;
  probe: MediaProbe;
  cutawayStillPath?: string;
}): RepairCommandPlan {
  const { startSeconds, endSeconds, intervalSeconds } =
    validateRepairTimestamps(input.request);
  assertRepairFitsMedia(input.request, input.probe);

  const fps = input.probe.fps;
  const frame = 1 / Math.max(fps, 1);
  const start = formatSeconds(startSeconds);
  const end = formatSeconds(Math.min(endSeconds, input.probe.durationSeconds));
  const gap = formatSeconds(intervalSeconds);
  const preFrameT = formatSeconds(Math.max(0, startSeconds - frame));
  const postFrameT = formatSeconds(
    Math.min(input.probe.durationSeconds, Math.min(endSeconds, input.probe.durationSeconds) + frame),
  );

  const filters: string[] = [];
  const strategy = input.request.strategy;
  let cutawayDuration = 0;
  let cutawayFade = 0;

  if (strategy === "cut_if_safe") {
    filters.push(
      `[0:v]trim=0:${start},setpts=PTS-STARTPTS[pre]`,
      `[0:v]trim=start=${end},setpts=PTS-STARTPTS[post]`,
      `[pre][post]concat=n=2:v=1:a=0,fps=${fps}[v]`,
    );
    if (input.probe.hasAudio) {
      filters.push(
        `[0:a]atrim=0:${start},asetpts=PTS-STARTPTS[apre]`,
        `[0:a]atrim=start=${end},asetpts=PTS-STARTPTS[apost]`,
        `[apre][apost]concat=n=2:v=0:a=1[a]`,
      );
    }
  } else if (strategy === "crossfade_bridge") {
    if (input.request.preserveDuration) {
      filters.push(
        `[0:v]trim=0:${start},setpts=PTS-STARTPTS[pre]`,
        `[0:v]trim=start=${end},setpts=PTS-STARTPTS[post]`,
        `[0:v]select='gte(t,${preFrameT})*lt(t,${start})',loop=-1:1:0,setpts=N/${fps}/TB,trim=duration=${gap},setpts=PTS-STARTPTS[holdA]`,
        `[0:v]select='gte(t,${end})*lt(t,${postFrameT})',loop=-1:1:0,setpts=N/${fps}/TB,trim=duration=${gap},setpts=PTS-STARTPTS[holdB]`,
        `[holdA][holdB]xfade=transition=fade:duration=${gap}:offset=0[bridge]`,
        `[pre][bridge][post]concat=n=3:v=1:a=0,fps=${fps}[v]`,
      );
    } else {
      const fade = formatSeconds(
        Math.min(DEFAULT_HOLD_FADE_SECONDS, startSeconds * 0.5, intervalSeconds),
      );
      const offset = formatSeconds(Math.max(0, startSeconds - Number(fade)));
      filters.push(
        `[0:v]trim=0:${start},setpts=PTS-STARTPTS[pre]`,
        `[0:v]trim=start=${end},setpts=PTS-STARTPTS[post]`,
        `[pre][post]xfade=transition=fade:duration=${fade}:offset=${offset},fps=${fps}[v]`,
      );
    }
  } else if (strategy === "editorial_cutaway") {
    if (!input.cutawayStillPath) {
      throw new VideoRepairError(
        "strategy_unsuitable",
        "editorial_cutaway requires a prepared cutaway still path.",
      );
    }

    const fadeSeconds = cutawayFadeSecondsFor(input.request, input.probe);
    const durationSeconds = cutawayDurationSeconds(intervalSeconds, fadeSeconds);
    cutawayFade = fadeSeconds;
    cutawayDuration = durationSeconds;
    const zoomStart = input.request.cutaway?.zoomStart ?? DEFAULT_CUTAWAY_ZOOM_START;
    const zoomEnd = input.request.cutaway?.zoomEnd ?? DEFAULT_CUTAWAY_ZOOM_END;
    const frames = Math.max(1, Math.round(durationSeconds * fps));
    const zoomSpan = zoomEnd - zoomStart;
    const zoomExpr =
      Math.abs(zoomSpan) < 1e-6
        ? formatSeconds(zoomStart)
        : `${formatSeconds(zoomStart)}+${formatSeconds(zoomSpan)}*on/${Math.max(frames - 1, 1)}`;
    const width = input.probe.width;
    const height = input.probe.height;

    filters.push(
      `[0:v]trim=0:${start},fps=${fps},setpts=PTS-STARTPTS[pre]`,
      `[0:v]trim=start=${end},fps=${fps},setpts=PTS-STARTPTS[post]`,
      `[1:v]scale=${width}:${height},format=yuv420p,zoompan=z='min(${formatSeconds(Math.max(zoomStart, zoomEnd))},${zoomExpr})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}:fps=${fps},fps=${fps},trim=duration=${formatSeconds(durationSeconds)},setpts=PTS-STARTPTS[cut]`,
    );

    if (fadeSeconds > 0) {
      const fade = formatSeconds(fadeSeconds);
      const inOffset = formatSeconds(Math.max(0, startSeconds - fadeSeconds));
      const outOffset = formatSeconds(endSeconds);
      filters.push(
        `[pre][cut]xfade=transition=fade:duration=${fade}:offset=${inOffset}[precut]`,
        `[precut][post]xfade=transition=fade:duration=${fade}:offset=${outOffset},fps=${fps}[v]`,
      );
    } else {
      filters.push(`[pre][cut][post]concat=n=3:v=1:a=0,fps=${fps}[v]`);
    }
  } else {
    const fadeSeconds = holdFadeSecondsFor(input.request, intervalSeconds, fps);
    const fade = formatSeconds(fadeSeconds);
    const holdOffset = formatSeconds(Math.max(0, intervalSeconds - fadeSeconds));
    filters.push(
      `[0:v]trim=0:${start},setpts=PTS-STARTPTS[pre]`,
      `[0:v]trim=start=${end},setpts=PTS-STARTPTS[post]`,
      `[0:v]select='gte(t,${preFrameT})*lt(t,${start})',loop=-1:1:0,setpts=N/${fps}/TB,trim=duration=${gap},setpts=PTS-STARTPTS[holdA]`,
      `[0:v]select='gte(t,${end})*lt(t,${postFrameT})',loop=-1:1:0,setpts=N/${fps}/TB,trim=duration=${fade},setpts=PTS-STARTPTS[holdB]`,
      `[holdA][holdB]xfade=transition=fade:duration=${fade}:offset=${holdOffset}[bridge]`,
      `[pre][bridge][post]concat=n=3:v=1:a=0,fps=${fps}[v]`,
    );
  }

  const filterGraph = filters.join(";");
  const args: string[] = ["-y", "-i", input.inputPath];

  if (strategy === "editorial_cutaway" && input.cutawayStillPath) {
    args.push(
      "-loop",
      "1",
      "-framerate",
      String(fps),
      "-t",
      formatSeconds(cutawayDuration),
      "-i",
      input.cutawayStillPath,
    );
  }

  args.push("-filter_complex", filterGraph, "-map", "[v]");

  if (input.probe.hasAudio && input.request.preserveDuration) {
    args.push("-map", "0:a:0", "-c:a", "copy");
  } else if (input.probe.hasAudio && strategy === "cut_if_safe") {
    args.push("-map", "[a]", "-c:a", "aac", "-b:a", "192k");
  } else if (input.probe.hasAudio && strategy === "crossfade_bridge" && !input.request.preserveDuration) {
    args.push("-map", "0:a:0", "-c:a", "copy");
  } else {
    args.push("-an");
  }

  const preset = input.request.x264Preset ?? "fast";
  args.push(
    "-c:v",
    "libx264",
    "-preset",
    preset,
    "-crf",
    "18",
    "-pix_fmt",
    "yuv420p",
    "-r",
    String(fps),
    "-movflags",
    "+faststart",
    input.outputPath,
  );

  return { args, filterGraph, reencodedVideo: true };
}

export function describeRepairDiagnostics(input: {
  args: string[];
  filterGraph: string;
  request: VideoRepairRequest;
  probe: MediaProbe;
  maxRepairSeconds: number;
}): VideoRepairDiagnostics {
  const intervalSeconds = input.request.endSeconds - input.request.startSeconds;
  const cutawayFade =
    input.request.strategy === "editorial_cutaway"
      ? cutawayFadeSecondsFor(input.request, input.probe)
      : undefined;
  const cutawayDuration =
    cutawayFade === undefined
      ? undefined
      : cutawayDurationSeconds(intervalSeconds, cutawayFade);

  return {
    ffmpegArgs: input.args,
    filterGraph: input.filterGraph,
    fps: input.probe.fps,
    width: input.probe.width,
    height: input.probe.height,
    hasAudio: input.probe.hasAudio,
    preserveDuration: input.request.preserveDuration,
    requestedStartSeconds: input.request.startSeconds,
    requestedEndSeconds: input.request.endSeconds,
    maxRepairSeconds: input.maxRepairSeconds,
    holdFadeSeconds:
      input.request.strategy === "hold_and_bridge"
        ? holdFadeSecondsFor(input.request, intervalSeconds, input.probe.fps)
        : undefined,
    cutawaySourceSeconds: input.request.cutaway?.sourceSeconds,
    cutawayDurationSeconds: cutawayDuration,
    cutawayFadeSeconds: cutawayFade,
  };
}

export async function repairVideoSegment(
  request: VideoRepairRequest,
): Promise<VideoRepairResult> {
  const { maxRepairSeconds } = validateRepairTimestamps(request);
  const resolution = resolveFfmpegBinary();
  if (!resolution.path) {
    throw new VideoRepairError(
      "ffmpeg_unavailable",
      "Bundled ffmpeg binary could not be resolved.",
    );
  }

  if (request.inputPath) {
    resolveCurrentSourceAsset({ explicitSourcePath: request.inputPath });
  } else if (!request.inputBuffer) {
    throw new VideoRepairError(
      "source_unresolved",
      "Repair must receive an explicitly selected current source asset (inputPath or inputBuffer).",
    );
  }

  let tempDir: string | null = null;
  try {
    tempDir = await mkdtemp(join(tmpdir(), "metaprom-video-repair-"));
    const inputPath = request.inputPath ?? join(tempDir, "input.mp4");
    const outputPath = join(tempDir, "output.mp4");
    if (!request.inputPath) {
      await writeFile(inputPath, request.inputBuffer as Buffer);
    }

    const probe = await probeMedia(resolution.path, inputPath);
    let cutawayStillPath: string | undefined;
    if (request.strategy === "editorial_cutaway") {
      const cutaway = assertEditorialCutawaySpec(
        request.cutaway,
        request.startSeconds,
        Math.min(request.endSeconds, probe.durationSeconds),
        probe,
      );
      cutawayStillPath = join(tempDir, "cutaway-still.png");
      await extractCutawayStill({
        ffmpegPath: resolution.path,
        sourcePath: inputPath,
        outputPath: cutawayStillPath,
        sourceSeconds: cutaway.sourceSeconds,
        width: probe.width,
        height: probe.height,
        crop: cutaway.crop,
      });
    }

    const plan = buildRepairFfmpegArgs({
      inputPath,
      outputPath,
      request,
      probe,
      cutawayStillPath,
    });

    await runFfmpeg(resolution.path, plan.args);
    const buffer = await readFile(outputPath);
    const repairedProbe = await probeMedia(resolution.path, outputPath);
    const removedDurationSeconds = request.preserveDuration
      ? 0
      : Math.max(0, probe.durationSeconds - repairedProbe.durationSeconds);

    return {
      buffer,
      repaired: true,
      strategyUsed: request.strategy,
      originalDurationSeconds: probe.durationSeconds,
      repairedDurationSeconds: repairedProbe.durationSeconds,
      removedDurationSeconds,
      reencodedVideo: true,
      diagnostics: describeRepairDiagnostics({
        args: plan.args,
        filterGraph: plan.filterGraph,
        request,
        probe,
        maxRepairSeconds,
      }),
    };
  } catch (error) {
    if (error instanceof VideoRepairError) throw error;
    const details =
      error instanceof FfmpegRunError
        ? {
            exitCode: error.details.exitCode,
            signal: error.details.signal,
            stderrTail: error.details.stderrTail,
          }
        : undefined;
    throw new VideoRepairError(
      "ffmpeg_failed",
      error instanceof Error ? error.message : String(error),
      details,
    );
  } finally {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}
