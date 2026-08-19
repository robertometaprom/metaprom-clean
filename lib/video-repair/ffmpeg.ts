import { spawn } from "child_process";
import { existsSync } from "fs";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import ffmpegStatic from "ffmpeg-static";
import {
  VideoRepairError,
  type MediaProbe,
} from "./types";

type FfmpegResolution = {
  path: string | null;
  source: "package" | "cwd-fallback" | "missing";
};

export class FfmpegRunError extends Error {
  constructor(
    message: string,
    readonly details: {
      exitCode: number | null;
      signal: NodeJS.Signals | null;
      stderrTail: string;
    },
  ) {
    super(message);
    this.name = "FfmpegRunError";
  }
}

/**
 * Resolves the bundled FFmpeg binary. Pattern is copied locally so this
 * module does not import production video transcode code.
 */
export function resolveFfmpegBinary(): FfmpegResolution {
  if (ffmpegStatic && existsSync(ffmpegStatic)) {
    return { path: ffmpegStatic, source: "package" };
  }

  const binary = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
  const fallback = join(process.cwd(), "node_modules", "ffmpeg-static", binary);

  if (existsSync(fallback)) {
    return { path: fallback, source: "cwd-fallback" };
  }

  return { path: null, source: "missing" };
}

export function runFfmpeg(
  ffmpegPath: string,
  args: string[],
  options?: { allowNonZeroExit?: boolean },
): Promise<{ stderr: string; exitCode: number | null }> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";

    child.stderr.on("data", (chunk: Buffer) => {
      stderr = `${stderr}${chunk.toString()}`.slice(-24_000);
    });

    child.on("error", (error) => {
      reject(
        new FfmpegRunError(error.message, {
          exitCode: null,
          signal: null,
          stderrTail: stderr,
        }),
      );
    });

    child.on("close", (code, signal) => {
      if (code === 0 || options?.allowNonZeroExit) {
        resolve({ stderr, exitCode: code });
        return;
      }
      reject(
        new FfmpegRunError(`ffmpeg exited with code ${code}`, {
          exitCode: code,
          signal,
          stderrTail: stderr,
        }),
      );
    });
  });
}

export function parseFfmpegProbeOutput(stderr: string): MediaProbe {
  const durationMatch = stderr.match(
    /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/,
  );
  if (!durationMatch) {
    throw new VideoRepairError(
      "probe_failed",
      "Could not parse media duration from FFmpeg output.",
    );
  }

  const durationSeconds =
    Number(durationMatch[1]) * 3600 +
    Number(durationMatch[2]) * 60 +
    Number(durationMatch[3]);

  const videoMatch = stderr.match(
    /Stream #0:\d[^\n]*Video:\s*([^\n]+)/,
  );
  if (!videoMatch) {
    throw new VideoRepairError(
      "probe_failed",
      "Input has no video stream.",
    );
  }

  const videoLine = videoMatch[1];
  const sizeMatch = videoLine.match(/\b(\d{2,5})x(\d{2,5})\b/);
  const fpsMatch =
    videoLine.match(/\b(\d+(?:\.\d+)?)\s*fps\b/i) ??
    videoLine.match(/\b(\d+(?:\.\d+)?)\s*tbr\b/i);

  if (!sizeMatch || !fpsMatch) {
    throw new VideoRepairError(
      "probe_failed",
      "Could not parse video width/height/fps from FFmpeg output.",
      { videoLine },
    );
  }

  const hasAudio = /Stream #0:\d[^\n]*Audio:/.test(stderr);

  return {
    durationSeconds,
    width: Number(sizeMatch[1]),
    height: Number(sizeMatch[2]),
    fps: Number(fpsMatch[1]),
    hasVideo: true,
    hasAudio,
  };
}

export async function probeMedia(
  ffmpegPath: string,
  inputPath: string,
): Promise<MediaProbe> {
  const { stderr } = await runFfmpeg(
    ffmpegPath,
    ["-hide_banner", "-i", inputPath],
    { allowNonZeroExit: true },
  );

  try {
    return parseFfmpegProbeOutput(stderr);
  } catch (error) {
    if (error instanceof VideoRepairError) {
      throw new VideoRepairError(error.code, error.message, {
        ...error.details,
        stderrTail: stderr.slice(-4_000),
      });
    }
    throw error;
  }
}

export async function extractCutawayStill(input: {
  ffmpegPath: string;
  sourcePath: string;
  outputPath: string;
  sourceSeconds: number;
  width: number;
  height: number;
  crop?: { x: number; y: number; width: number; height: number };
}): Promise<void> {
  const filters: string[] = [];
  if (input.crop) {
    const { x, y, width, height } = input.crop;
    filters.push(`crop=${width}:${height}:${x}:${y}`);
  }
  filters.push(`scale=${input.width}:${input.height}`);

  await runFfmpeg(input.ffmpegPath, [
    "-y",
    "-ss",
    input.sourceSeconds.toFixed(3),
    "-i",
    input.sourcePath,
    "-vf",
    filters.join(","),
    "-frames:v",
    "1",
    input.outputPath,
  ]);
}

export async function muxVideoWithAudio(input: {
  videoBuffer: Buffer;
  audioBuffer: Buffer;
}): Promise<Buffer> {
  const resolution = resolveFfmpegBinary();
  if (!resolution.path) {
    throw new VideoRepairError(
      "ffmpeg_unavailable",
      "Bundled ffmpeg binary could not be resolved.",
    );
  }

  let tempDir: string | null = null;
  try {
    tempDir = await mkdtemp(join(tmpdir(), "metaprom-repair-mux-"));
    const videoPath = join(tempDir, "video.mp4");
    const audioPath = join(tempDir, "audio.mp4");
    const outputPath = join(tempDir, "muxed.mp4");
    await writeFile(videoPath, input.videoBuffer);
    await writeFile(audioPath, input.audioBuffer);

    await runFfmpeg(resolution.path, [
      "-y",
      "-i",
      videoPath,
      "-i",
      audioPath,
      "-map",
      "0:v:0",
      "-map",
      "1:a:0",
      "-c:v",
      "copy",
      "-c:a",
      "copy",
      "-movflags",
      "+faststart",
      outputPath,
    ]);

    return readFile(outputPath);
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
