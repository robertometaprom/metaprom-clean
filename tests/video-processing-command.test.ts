import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildCommercialVideoFfmpegArgs } from "../lib/video-processing-command.ts";
import {
  processCommercialVideo,
  resolveFfmpegBinary,
} from "../lib/video-processing.ts";

test("teaser command overlays a pre-rendered watermark without drawtext", () => {
  const args = buildCommercialVideoFfmpegArgs({
    inputPath: "/tmp/input.mp4",
    outputPath: "/tmp/output.mp4",
    watermarkPath: "/tmp/watermark.png",
    maxSeconds: 4,
    crf: 30,
  });
  const command = args.join(" ");

  assert.match(command, /-filter_complex \[0:v\]\[1:v\]overlay=/);
  assert.doesNotMatch(command, /drawtext/);
  assert.match(command, /-c:v libx264/);
  assert.match(command, /-c:a aac/);
  assert.match(command, /-movflags \+faststart/);
  assert.equal(args.at(-1), "/tmp/output.mp4");
});

test("Premium command transcodes without a watermark filter", () => {
  const args = buildCommercialVideoFfmpegArgs({
    inputPath: "/tmp/input.mp4",
    outputPath: "/tmp/output.mp4",
    maxSeconds: 12,
    crf: 22,
  });
  const command = args.join(" ");

  assert.doesNotMatch(command, /overlay=/);
  assert.doesNotMatch(command, /filter_complex/);
  assert.match(command, /-map 0:v:0 -map 0:a\?/);
});

test("bundled FFmpeg performs the teaser transcode and PNG watermark path", async () => {
  const resolution = resolveFfmpegBinary();
  assert.ok(resolution.path, "ffmpeg-static binary must resolve");

  const directory = await mkdtemp(join(tmpdir(), "metaprom-video-test-"));
  const sourcePath = join(directory, "source.mp4");

  try {
    const generated = spawnSync(
      resolution.path,
      [
        "-y",
        "-f",
        "lavfi",
        "-i",
        "color=c=navy:s=320x180:d=1",
        "-f",
        "lavfi",
        "-i",
        "anullsrc=r=48000:cl=stereo",
        "-shortest",
        "-c:v",
        "libx264",
        "-c:a",
        "aac",
        sourcePath,
      ],
      { encoding: "utf8" },
    );
    assert.equal(generated.status, 0, generated.stderr);

    const result = await processCommercialVideo({
      buffer: await readFile(sourcePath),
      tier: "teaser",
    });
    assert.equal(result.processed, true, result.failure?.message);
    assert.ok(result.buffer.length > 0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
