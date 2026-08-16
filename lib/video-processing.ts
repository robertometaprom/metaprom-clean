import { spawn } from "child_process";
import { existsSync } from "fs";
import ffmpegStatic from "ffmpeg-static";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import sharp from "sharp";
import {
  getTierVideoConfig,
  WATERMARK_TEXT,
  type CommercialTier,
} from "@/lib/commercial/tiers";
import { buildCommercialVideoFfmpegArgs } from "@/lib/video-processing-command";
import {
  hasRequiredPromotionalOverlays,
  renderPromotionalOverlay,
  type PromotionalOverlayTiming,
} from "@/lib/promotional-overlay";
import type { PromotionalOverlays } from "@/lib/commercial-production-profile";
import type { VeoAspectRatio } from "@/lib/destination-generation";
import type { ExactLogoSource } from "@/lib/creative-recipe";
import { COMMERCIAL_FONT_IDENTITY, commercialFontFaceCss } from "@/lib/commercial-font";
import type { OverlayStyle } from "@/lib/overlay-style-contract";

type ProcessVideoInput = {
  buffer: Buffer;
  tier: CommercialTier;
  promotionalOverlays?: PromotionalOverlays | null;
  aspectRatio?: VeoAspectRatio;
  exactLogoSource?: ExactLogoSource | null;
  overlayStyle?: OverlayStyle | null;
};

type ProcessVideoResult = {
  buffer: Buffer;
  processed: boolean;
  failure?: VideoProcessingFailure;
};

export type VideoProcessingFailure = {
  code: "ffmpeg_unavailable" | "watermark_render_failed" | "promotional_overlay_render_failed" | "ffmpeg_failed";
  stage: "resolve" | "watermark" | "promotional_overlay" | "transcode";
  message: string;
};

type FfmpegResolution = {
  path: string | null;
  source: "package" | "cwd-fallback" | "missing";
};

class FfmpegRunError extends Error {
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

function runFfmpeg(ffmpegPath: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";

    child.stderr.on("data", (chunk: Buffer) => {
      stderr = `${stderr}${chunk.toString()}`.slice(-12_000);
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
      if (code === 0) {
        resolve();
      } else {
        reject(
          new FfmpegRunError(`ffmpeg exited with code ${code}`, {
            exitCode: code,
            signal,
            stderrTail: stderr,
          }),
        );
      }
    });
  });
}

async function renderTeaserWatermark(path: string): Promise<void> {
  const escapedText = WATERMARK_TEXT.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const fontFace = await commercialFontFaceCss();
  const svg = `<svg width="300" height="54" xmlns="http://www.w3.org/2000/svg">
    <style>${fontFace}</style>
    <rect width="300" height="54" rx="8" fill="rgba(0,0,0,0.45)"/>
    <text x="150" y="36" text-anchor="middle" font-family="${COMMERCIAL_FONT_IDENTITY.family}" font-size="28" font-weight="600" fill="rgba(255,255,255,0.85)">${escapedText}</text>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(path);
}

function safeFailureMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function processCommercialVideo(
  input: ProcessVideoInput,
): Promise<ProcessVideoResult> {
  const config = getTierVideoConfig(input.tier);
  const resolution = resolveFfmpegBinary();

  if (!resolution.path) {
    const failure: VideoProcessingFailure = {
      code: "ffmpeg_unavailable",
      stage: "resolve",
      message: "Bundled ffmpeg binary could not be resolved.",
    };
    console.error("[commercial-video-processing] failed", {
      ...failure,
      binarySource: resolution.source,
      platform: process.platform,
      arch: process.arch,
    });
    return { buffer: input.buffer, processed: false, failure };
  }

  let tempDir: string | null = null;

  try {
    tempDir = await mkdtemp(join(tmpdir(), "metaprom-video-"));
    const inputPath = join(tempDir, "input.mp4");
    const outputPath = join(tempDir, "output.mp4");
    const watermarkPath = config.applyWatermark
      ? join(tempDir, "teaser-watermark.png")
      : null;
    const promotionalOverlayPath = hasRequiredPromotionalOverlays(
      input.promotionalOverlays,
    )
      ? join(tempDir, "promotional-overlays.png")
      : null;

    await writeFile(inputPath, input.buffer);
    let promotionalOverlayTiming: PromotionalOverlayTiming | undefined;

    if (watermarkPath) {
      try {
        await renderTeaserWatermark(watermarkPath);
      } catch (error) {
        const failure: VideoProcessingFailure = {
          code: "watermark_render_failed",
          stage: "watermark",
          message: safeFailureMessage(error),
        };
        console.error("[commercial-video-processing] failed", {
          ...failure,
          binarySource: resolution.source,
          inputBytes: input.buffer.length,
          tier: input.tier,
        });
        return { buffer: input.buffer, processed: false, failure };
      }
    }

    if (promotionalOverlayPath) {
      try {
        const placement = await renderPromotionalOverlay({
          path: promotionalOverlayPath,
          overlays: input.promotionalOverlays!,
          aspectRatio: input.aspectRatio,
          exactLogoSource: input.exactLogoSource,
          overlayStyle: input.overlayStyle,
        });
        promotionalOverlayTiming = placement.timing;
      } catch (error) {
        const failure: VideoProcessingFailure = {
          code: "promotional_overlay_render_failed",
          stage: "promotional_overlay",
          message: safeFailureMessage(error),
        };
        console.error("[commercial-video-processing] failed", {
          ...failure,
          inputBytes: input.buffer.length,
          tier: input.tier,
        });
        return { buffer: input.buffer, processed: false, failure };
      }
    }

    const args = buildCommercialVideoFfmpegArgs({
      inputPath,
      outputPath,
      watermarkPath,
      promotionalOverlayPath,
      promotionalOverlayTiming,
      maxSeconds: config.maxSeconds,
      crf: config.crf,
    });

    await runFfmpeg(resolution.path, args);

    const outputBuffer = await readFile(outputPath);
    return { buffer: outputBuffer, processed: true };
  } catch (error) {
    const failure: VideoProcessingFailure = {
      code: "ffmpeg_failed",
      stage: "transcode",
      message: safeFailureMessage(error),
    };
    console.error("[commercial-video-processing] failed", {
      ...failure,
      binarySource: resolution.source,
      binaryName: resolution.path.split(/[\\/]/).pop(),
      inputBytes: input.buffer.length,
      tier: input.tier,
      exitCode: error instanceof FfmpegRunError ? error.details.exitCode : null,
      signal: error instanceof FfmpegRunError ? error.details.signal : null,
      stderrTail:
        error instanceof FfmpegRunError ? error.details.stderrTail : undefined,
    });
    return { buffer: input.buffer, processed: false, failure };
  } finally {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}
