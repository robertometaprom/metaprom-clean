export type CommercialVideoCommandInput = {
  inputPath: string;
  outputPath: string;
  watermarkPath?: string | null;
  maxSeconds: number;
  crf: number;
};

/**
 * Builds the current teaser/Premium transcode command without relying on
 * FFmpeg's optional drawtext/font stack. Teasers receive a pre-rendered PNG.
 */
export function buildCommercialVideoFfmpegArgs(
  input: CommercialVideoCommandInput,
): string[] {
  const args = ["-y", "-i", input.inputPath];

  if (input.watermarkPath) {
    args.push("-i", input.watermarkPath);
  }

  args.push("-t", String(input.maxSeconds));

  if (input.watermarkPath) {
    args.push(
      "-filter_complex",
      "[0:v][1:v]overlay=W-w-24:H-h-24:format=auto[v]",
      "-map",
      "[v]",
      "-map",
      "0:a?",
    );
  } else {
    args.push("-map", "0:v:0", "-map", "0:a?");
  }

  args.push(
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    String(input.crf),
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "96k",
    "-movflags",
    "+faststart",
    input.outputPath,
  );

  return args;
}
