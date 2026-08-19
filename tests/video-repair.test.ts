/**
 * Isolated Commercial Rescue R1 — deterministic local video repair.
 * No providers, no production wiring.
 *
 * Run: npm run test:video-repair
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { parseFfmpegProbeOutput, probeMedia, resolveFfmpegBinary } from "../lib/video-repair/ffmpeg.ts";
import {
  assertRepairFitsMedia,
  buildRepairFfmpegArgs,
  repairVideoSegment,
  validateRepairTimestamps,
} from "../lib/video-repair/repair-video-segment.ts";
import { resolveCurrentSourceAsset } from "../lib/video-repair/source-asset.ts";
import {
  DEFAULT_MAX_REPAIR_SECONDS,
  VideoRepairError,
  type MediaProbe,
  type VideoRepairRequest,
} from "../lib/video-repair/types.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

const sampleProbe: MediaProbe = {
  durationSeconds: 10.04,
  width: 1920,
  height: 1080,
  fps: 24,
  hasVideo: true,
  hasAudio: false,
};

const sampleRequest: VideoRepairRequest = {
  inputBuffer: Buffer.alloc(0),
  startSeconds: 3.5,
  endSeconds: 4.5,
  strategy: "crossfade_bridge",
  preserveDuration: true,
};

function ffmpegOrSkip(): string {
  const resolution = resolveFfmpegBinary();
  assert.ok(resolution.path, "ffmpeg-static binary must resolve");
  return resolution.path;
}

async function makeSilentFixture(options: {
  path: string;
  durationSeconds: number;
  size?: string;
  fps?: number;
  withAudio?: boolean;
}): Promise<void> {
  const ffmpegPath = ffmpegOrSkip();
  const fps = options.fps ?? 24;
  const size = options.size ?? "320x180";
  const args = [
    "-y",
    "-f",
    "lavfi",
    "-i",
    `testsrc2=size=${size}:rate=${fps}:duration=${options.durationSeconds}`,
  ];
  if (options.withAudio) {
    args.push(
      "-f",
      "lavfi",
      "-i",
      `sine=frequency=440:duration=${options.durationSeconds}`,
    );
  }
  args.push("-pix_fmt", "yuv420p", "-c:v", "libx264", "-preset", "ultrafast");
  if (options.withAudio) {
    args.push("-c:a", "aac", "-shortest");
  } else {
    args.push("-an");
  }
  args.push(options.path);
  const generated = spawnSync(ffmpegPath, args, { encoding: "utf8" });
  assert.equal(generated.status, 0, generated.stderr);
}

test("invalid timestamps are rejected", () => {
  assert.throws(
    () =>
      validateRepairTimestamps({
        startSeconds: 1.2,
        endSeconds: 1.2,
        strategy: "cut_if_safe",
      }),
    (error: unknown) =>
      error instanceof VideoRepairError && error.code === "invalid_timestamps",
  );
  assert.throws(
    () =>
      validateRepairTimestamps({
        startSeconds: 2,
        endSeconds: 1,
        strategy: "cut_if_safe",
      }),
    (error: unknown) =>
      error instanceof VideoRepairError && error.code === "invalid_timestamps",
  );
  assert.throws(
    () =>
      validateRepairTimestamps({
        startSeconds: Number.NaN,
        endSeconds: 1,
        strategy: "crossfade_bridge",
      }),
    (error: unknown) =>
      error instanceof VideoRepairError && error.code === "invalid_timestamps",
  );
  assert.throws(
    () =>
      validateRepairTimestamps({
        startSeconds: -0.1,
        endSeconds: 0.4,
        strategy: "hold_and_bridge",
      }),
    (error: unknown) =>
      error instanceof VideoRepairError && error.code === "invalid_timestamps",
  );
});

test("intervals outside media duration are rejected", () => {
  assert.throws(
    () =>
      assertRepairFitsMedia(
        {
          startSeconds: 9.5,
          endSeconds: 10.5,
          strategy: "crossfade_bridge",
          preserveDuration: true,
        },
        sampleProbe,
      ),
    (error: unknown) =>
      error instanceof VideoRepairError && error.code === "interval_outside_duration",
  );
  assert.throws(
    () =>
      assertRepairFitsMedia(
        {
          startSeconds: 10.04,
          endSeconds: 10.2,
          strategy: "cut_if_safe",
          preserveDuration: false,
        },
        sampleProbe,
      ),
    (error: unknown) =>
      error instanceof VideoRepairError && error.code === "interval_outside_duration",
  );
});

test("interval greater than configured maximum is rejected", () => {
  assert.equal(DEFAULT_MAX_REPAIR_SECONDS, 1);
  assert.throws(
    () =>
      validateRepairTimestamps({
        startSeconds: 2.25,
        endSeconds: 10,
        strategy: "crossfade_bridge",
      }),
    (error: unknown) =>
      error instanceof VideoRepairError && error.code === "interval_exceeds_maximum",
  );
  assert.throws(
    () =>
      validateRepairTimestamps({
        startSeconds: 1,
        endSeconds: 2.1,
        strategy: "hold_and_bridge",
        maxRepairSeconds: 1,
      }),
    (error: unknown) =>
      error instanceof VideoRepairError && error.code === "interval_exceeds_maximum",
  );
  const allowed = validateRepairTimestamps({
    startSeconds: 3.5,
    endSeconds: 4.5,
    strategy: "crossfade_bridge",
    maxRepairSeconds: 1,
  });
  assert.equal(allowed.intervalSeconds, 1);
});

test("FFmpeg args are deterministic for the same repair request", () => {
  const first = buildRepairFfmpegArgs({
    inputPath: "/tmp/input.mp4",
    outputPath: "/tmp/output.mp4",
    request: sampleRequest,
    probe: sampleProbe,
  });
  const second = buildRepairFfmpegArgs({
    inputPath: "/tmp/input.mp4",
    outputPath: "/tmp/output.mp4",
    request: sampleRequest,
    probe: sampleProbe,
  });
  assert.deepEqual(first.args, second.args);
  assert.equal(first.filterGraph, second.filterGraph);
  assert.match(first.filterGraph, /xfade=transition=fade/);
  assert.match(first.filterGraph, /concat=n=3:v=1:a=0/);
  assert.doesNotMatch(first.args.join(" "), /https?:|openai|fal\.ai|vertex|kling/i);
  assert.equal(first.args.at(-1), "/tmp/output.mp4");
});

test("editorial_cutaway args replace the interval with a still, not a body-pose crossfade", () => {
  const request: VideoRepairRequest = {
    inputBuffer: Buffer.alloc(0),
    startSeconds: 3.541667,
    endSeconds: 4.75,
    strategy: "editorial_cutaway",
    preserveDuration: true,
    maxRepairSeconds: 2,
    cutaway: {
      sourceSeconds: 2,
      crop: { x: 40, y: 250, width: 720, height: 405 },
      zoomStart: 1,
      zoomEnd: 1.06,
      fadeSeconds: 2 / 24,
    },
  };
  const first = buildRepairFfmpegArgs({
    inputPath: "/tmp/input.mp4",
    outputPath: "/tmp/output.mp4",
    request,
    probe: sampleProbe,
    cutawayStillPath: "/tmp/cutaway-still.png",
  });
  const second = buildRepairFfmpegArgs({
    inputPath: "/tmp/input.mp4",
    outputPath: "/tmp/output.mp4",
    request,
    probe: sampleProbe,
    cutawayStillPath: "/tmp/cutaway-still.png",
  });
  assert.deepEqual(first.args, second.args);
  assert.match(first.filterGraph, /\[1:v\]/);
  assert.match(first.filterGraph, /zoompan=/);
  assert.match(first.filterGraph, /xfade=transition=fade/);
  assert.doesNotMatch(first.filterGraph, /\[holdA\]\[holdB\]/);
  assert.equal(first.args.includes("/tmp/cutaway-still.png"), true);
  assert.doesNotMatch(first.args.join(" "), /https?:|openai|fal\.ai|vertex|kling/i);
});

test("cut_if_safe cannot preserve duration; hold_and_bridge requires it", () => {
  assert.throws(
    () =>
      assertRepairFitsMedia(
        {
          startSeconds: 1,
          endSeconds: 1.4,
          strategy: "cut_if_safe",
          preserveDuration: true,
        },
        sampleProbe,
      ),
    (error: unknown) =>
      error instanceof VideoRepairError && error.code === "strategy_unsuitable",
  );
  assert.throws(
    () =>
      assertRepairFitsMedia(
        {
          startSeconds: 1,
          endSeconds: 1.4,
          strategy: "hold_and_bridge",
          preserveDuration: false,
        },
        sampleProbe,
      ),
    (error: unknown) =>
      error instanceof VideoRepairError && error.code === "strategy_unsuitable",
  );
});

test("editorial_cutaway must preserve duration and use a still outside the defect", () => {
  assert.throws(
    () =>
      assertRepairFitsMedia(
        {
          startSeconds: 3.5,
          endSeconds: 4.5,
          strategy: "editorial_cutaway",
          preserveDuration: false,
          cutaway: { sourceSeconds: 2 },
        },
        sampleProbe,
      ),
    (error: unknown) =>
      error instanceof VideoRepairError && error.code === "strategy_unsuitable",
  );
  assert.throws(
    () =>
      assertRepairFitsMedia(
        {
          startSeconds: 3.5,
          endSeconds: 4.5,
          strategy: "editorial_cutaway",
          preserveDuration: true,
          cutaway: { sourceSeconds: 4 },
        },
        sampleProbe,
      ),
    (error: unknown) =>
      error instanceof VideoRepairError && error.code === "strategy_unsuitable",
  );
  assert.doesNotThrow(() =>
    assertRepairFitsMedia(
      {
        startSeconds: 3.5,
        endSeconds: 4.5,
        strategy: "editorial_cutaway",
        preserveDuration: true,
        cutaway: { sourceSeconds: 2, crop: { x: 40, y: 250, width: 720, height: 405 } },
      },
      sampleProbe,
    ),
  );
});

test("probe parser reads duration, geometry, fps, and audio presence", () => {
  const stderr = `
  Duration: 00:00:10.04, start: 0.000000, bitrate: 19904 kb/s
  Stream #0:0[0x1](und): Video: h264 (Main) (avc1 / 0x31637661), yuv420p(progressive), 1920x1080, 19903 kb/s, 24 fps, 24 tbr, 12288 tbn (default)
  Stream #0:1[0x2](und): Audio: aac (LC) (mp4a / 0x6134706D), 48000 Hz, stereo, fltp, 190 kb/s (default)
`;
  const probe = parseFfmpegProbeOutput(stderr);
  assert.equal(probe.durationSeconds, 10.04);
  assert.equal(probe.width, 1920);
  assert.equal(probe.height, 1080);
  assert.equal(probe.fps, 24);
  assert.equal(probe.hasAudio, true);
  assert.equal(probe.hasVideo, true);
});

test("repair of a synthetic short video fixture preserves duration and decodes", async () => {
  const ffmpegPath = ffmpegOrSkip();
  const directory = await mkdtemp(join(tmpdir(), "metaprom-repair-fixture-"));
  const sourcePath = join(directory, "source.mp4");

  try {
    await makeSilentFixture({ path: sourcePath, durationSeconds: 2, withAudio: true });
    const inputBuffer = await readFile(sourcePath);

    const crossfade = await repairVideoSegment({
      inputBuffer,
      startSeconds: 0.8,
      endSeconds: 0.95,
      strategy: "crossfade_bridge",
      preserveDuration: true,
    });
    assert.equal(crossfade.repaired, true);
    assert.equal(crossfade.strategyUsed, "crossfade_bridge");
    assert.equal(crossfade.reencodedVideo, true);
    assert.ok(Math.abs(crossfade.repairedDurationSeconds - crossfade.originalDurationSeconds) < 0.12);
    assert.equal(crossfade.removedDurationSeconds, 0);

    const hold = await repairVideoSegment({
      inputBuffer,
      startSeconds: 0.8,
      endSeconds: 0.95,
      strategy: "hold_and_bridge",
      preserveDuration: true,
    });
    assert.equal(hold.repaired, true);
    assert.ok(Math.abs(hold.repairedDurationSeconds - hold.originalDurationSeconds) < 0.12);

    const cut = await repairVideoSegment({
      inputBuffer,
      startSeconds: 0.8,
      endSeconds: 0.95,
      strategy: "cut_if_safe",
      preserveDuration: false,
    });
    assert.equal(cut.repaired, true);
    assert.ok(cut.repairedDurationSeconds < cut.originalDurationSeconds - 0.05);
    assert.ok(cut.removedDurationSeconds > 0.05);

    const cutaway = await repairVideoSegment({
      inputBuffer,
      startSeconds: 0.8,
      endSeconds: 0.95,
      strategy: "editorial_cutaway",
      preserveDuration: true,
      cutaway: { sourceSeconds: 0.2, zoomStart: 1, zoomEnd: 1.04, fadeSeconds: 0 },
    });
    assert.equal(cutaway.repaired, true);
    assert.equal(cutaway.strategyUsed, "editorial_cutaway");
    assert.ok(Math.abs(cutaway.repairedDurationSeconds - cutaway.originalDurationSeconds) < 0.12);
    assert.match(cutaway.diagnostics.filterGraph, /zoompan=/);
    assert.doesNotMatch(cutaway.diagnostics.filterGraph, /\[holdA\]\[holdB\]/);

    const repairedPath = join(directory, "repaired.mp4");
    await writeFile(repairedPath, crossfade.buffer);
    const decoded = spawnSync(
      ffmpegPath,
      ["-v", "error", "-i", repairedPath, "-f", "null", "-"],
      { encoding: "utf8" },
    );
    assert.equal(decoded.status, 0, decoded.stderr);
    assert.equal(decoded.stderr.trim(), "");
    const repairedProbe = await probeMedia(ffmpegPath, repairedPath);
    assert.equal(repairedProbe.hasVideo, true);
    assert.equal(repairedProbe.hasAudio, true);
    assert.equal(repairedProbe.width, 320);
    assert.equal(repairedProbe.height, 180);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("latest valid source must be explicit; filename 'final' is not a fallback", async () => {
  const directory = await mkdtemp(join(tmpdir(), "metaprom-source-asset-"));
  try {
    const olderFinal = join(directory, "sattva-keto-commercial-final.mp4");
    const current = join(directory, "current-valid.mp4");
    await writeFile(olderFinal, Buffer.from("older-final"));
    await writeFile(current, Buffer.from("current-valid"));

    assert.throws(
      () => resolveCurrentSourceAsset({}),
      (error: unknown) =>
        error instanceof VideoRepairError && error.code === "source_unresolved",
    );
    assert.throws(
      () => resolveCurrentSourceAsset({ explicitSourcePath: "   " }),
      (error: unknown) =>
        error instanceof VideoRepairError && error.code === "source_unresolved",
    );
    assert.throws(
      () => resolveCurrentSourceAsset({ explicitSourcePath: join(directory, "missing.mp4") }),
      (error: unknown) =>
        error instanceof VideoRepairError && error.code === "source_unresolved",
    );

    const resolved = resolveCurrentSourceAsset({ explicitSourcePath: current });
    assert.equal(resolved.path, current);
    assert.equal(resolved.reason, "explicit");
    assert.notEqual(resolved.path, olderFinal);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("repairVideoSegment fails closed when no explicit source is selected", async () => {
  await assert.rejects(
    () =>
      repairVideoSegment({
        startSeconds: 0.8,
        endSeconds: 0.95,
        strategy: "cut_if_safe",
        preserveDuration: false,
      }),
    (error: unknown) =>
      error instanceof VideoRepairError && error.code === "source_unresolved",
  );
});

test("repair core has no network or provider dependencies", () => {
  const files = [
    "lib/video-repair/types.ts",
    "lib/video-repair/ffmpeg.ts",
    "lib/video-repair/repair-video-segment.ts",
    "lib/video-repair/source-asset.ts",
  ];
  for (const file of files) {
    const source = readRepo(file);
    assert.doesNotMatch(source, /\bfetch\s*\(/);
    assert.doesNotMatch(source, /https:\/\//);
    assert.doesNotMatch(source, /\bopenai\b/i);
    assert.doesNotMatch(source, /fal\.ai|@fal-ai|from ["']openai["']/);
    assert.doesNotMatch(source, /vertex-provider|kling|veo-3/i);
  }
});

test("repair core is not wired into production modules", () => {
  const repairSources = [
    readRepo("lib/video-repair/types.ts"),
    readRepo("lib/video-repair/ffmpeg.ts"),
    readRepo("lib/video-repair/repair-video-segment.ts"),
    readRepo("lib/video-repair/source-asset.ts"),
  ].join("\n");
  assert.doesNotMatch(repairSources, /\*final\*/);
  assert.doesNotMatch(repairSources, /readdirSync|readdir\(/);
  assert.doesNotMatch(repairSources, /generate-commercial-video/);
  assert.doesNotMatch(repairSources, /from ["'][^"']*video-processing/);
  assert.doesNotMatch(repairSources, /creative-director/);
  assert.doesNotMatch(repairSources, /entitlements/);
  assert.doesNotMatch(repairSources, /stripe/i);
  assert.doesNotMatch(repairSources, /biblioteca/);
  assert.doesNotMatch(repairSources, /\/api\/video/);
  assert.doesNotMatch(repairSources, /from ["']server-only["']/);

  const productionTouchpoints = [
    "app/api/video/route.ts",
    "lib/video/generate-commercial-video.ts",
    "lib/video-processing.ts",
    "lib/video/router.ts",
    "lib/studio/director-stage.ts",
  ];
  for (const file of productionTouchpoints) {
    const source = readRepo(file);
    assert.doesNotMatch(source, /video-repair/);
    assert.doesNotMatch(source, /repairVideoSegment/);
    assert.doesNotMatch(source, /crossfade_bridge/);
    assert.doesNotMatch(source, /editorial_cutaway/);
  }
});
