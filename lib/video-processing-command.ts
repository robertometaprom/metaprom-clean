export type CommercialVideoCommandInput = {
  inputPath: string;
  outputPath: string;
  watermarkPath?: string | null;
  promotionalOverlayPath?: string | null;
  promotionalOverlayTiming?: "full" | "intro" | "outro";
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

  const overlayPaths = [input.watermarkPath, input.promotionalOverlayPath].filter(
    (path): path is string => Boolean(path),
  );
  for (const overlayPath of overlayPaths) args.push("-i", overlayPath);

  args.push("-t", String(input.maxSeconds));

  if (overlayPaths.length) {
    const filterSteps: string[] = [];
    let currentVideo = "0:v";
    let inputIndex = 1;

    if (input.watermarkPath) {
      const output = input.promotionalOverlayPath ? "watermarked" : "v";
      filterSteps.push(
        `[${currentVideo}][${inputIndex}:v]overlay=W-w-24:H-h-24:format=auto[${output}]`,
      );
      currentVideo = output;
      inputIndex += 1;
    }

    if (input.promotionalOverlayPath) {
      const enable =
        input.promotionalOverlayTiming === "intro"
          ? ":enable='between(t,0,4)'"
          : input.promotionalOverlayTiming === "outro"
            ? `:enable='gte(t,${Math.max(0, input.maxSeconds - 4)})'`
            : "";
      filterSteps.push(
        `[${inputIndex}:v][${currentVideo}]scale2ref=w=main_w:h=main_h[promotion][base]`,
        `[base][promotion]overlay=0:0:format=auto${enable}[v]`,
      );
    }

    args.push(
      "-filter_complex",
      filterSteps.join(";"),
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
