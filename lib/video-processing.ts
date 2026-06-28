import { spawn } from "child_process";
import ffmpegStatic from "ffmpeg-static";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import {
  getTierVideoConfig,
  WATERMARK_TEXT,
  type CommercialTier,
} from "@/lib/commercial/tiers";

type ProcessVideoInput = {
  buffer: Buffer;
  tier: CommercialTier;
};

type ProcessVideoResult = {
  buffer: Buffer;
  processed: boolean;
};

function getFfmpegPath(): string | null {
  return ffmpegStatic ?? null;
}

function runFfmpeg(args: string[]): Promise<void> {
  const ffmpegPath = getFfmpegPath();

  if (!ffmpegPath) {
    return Promise.reject(new Error("ffmpeg not available"));
  }

  return new Promise((resolve, reject) => {
    const process = spawn(ffmpegPath, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";

    process.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    process.on("error", reject);
    process.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(stderr || `ffmpeg exited with code ${code}`));
      }
    });
  });
}

export async function processCommercialVideo(
  input: ProcessVideoInput,
): Promise<ProcessVideoResult> {
  const config = getTierVideoConfig(input.tier);
  const ffmpegPath = getFfmpegPath();

  if (!ffmpegPath) {
    return { buffer: input.buffer, processed: false };
  }

  let tempDir: string | null = null;

  try {
    tempDir = await mkdtemp(join(tmpdir(), "metaprom-video-"));
    const inputPath = join(tempDir, "input.mp4");
    const outputPath = join(tempDir, "output.mp4");

    await writeFile(inputPath, input.buffer);

    const filters: string[] = [];

    if (config.applyWatermark) {
      filters.push(
        `drawtext=text='${WATERMARK_TEXT}':fontcolor=white@0.85:fontsize=28:x=(w-text_w-24):y=(h-text_h-24):shadowcolor=black@0.45:shadowx=2:shadowy=2`,
      );
    }

    const args = [
      "-y",
      "-i",
      inputPath,
      "-t",
      String(config.maxSeconds),
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      String(config.crf),
      "-c:a",
      "aac",
      "-b:a",
      "96k",
    ];

    if (filters.length > 0) {
      args.push("-vf", filters.join(","));
    }

    args.push("-movflags", "+faststart", outputPath);

    await runFfmpeg(args);

    const outputBuffer = await readFile(outputPath);
    return { buffer: outputBuffer, processed: true };
  } catch (error) {
    console.error("Video post-processing failed:", error);
    return { buffer: input.buffer, processed: false };
  } finally {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}
