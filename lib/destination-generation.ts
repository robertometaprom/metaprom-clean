import type { StudioDestination } from "./studio-destination";

export type VeoAspectRatio = "9:16" | "16:9";

export const VEO_SUPPORTED_ASPECT_RATIOS: readonly VeoAspectRatio[] = [
  "9:16",
  "16:9",
];

export type DestinationGenerationPayload = {
  destination: {
    platform: string;
    aspectRatio: string;
    width?: number;
    height?: number;
  };
};

export type VeoGenerationParams = {
  aspectRatio: VeoAspectRatio;
  requestedAspectRatio: string;
  aspectRatioNote?: string;
};

function normalizePlatform(platform: string): string {
  return platform.trim().toLowerCase();
}

export function parseStudioDestination(
  raw: unknown,
): StudioDestination | null {
  if (!raw || typeof raw !== "object") return null;

  const value = raw as Record<string, unknown>;
  const platform =
    typeof value.platform === "string" ? value.platform.trim() : "";
  const aspectRatio =
    typeof value.aspectRatio === "string" ? value.aspectRatio.trim() : "";

  if (!platform || !aspectRatio) return null;

  const destination: StudioDestination = { platform, aspectRatio };

  if (typeof value.width === "number" && value.width > 0) {
    destination.width = value.width;
  }

  if (typeof value.height === "number" && value.height > 0) {
    destination.height = value.height;
  }

  return destination;
}

export function parseStudioDestinationFromFormData(
  formData: FormData,
): StudioDestination | null {
  const raw = formData.get("destination");
  if (typeof raw !== "string" || !raw.trim()) return null;

  try {
    return parseStudioDestination(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function toDestinationGenerationPayload(
  destination: StudioDestination,
): DestinationGenerationPayload {
  return {
    destination: {
      platform: destination.platform,
      aspectRatio: destination.aspectRatio,
      ...(destination.width ? { width: destination.width } : {}),
      ...(destination.height ? { height: destination.height } : {}),
    },
  };
}

function mapAspectRatioStringToVeo(
  requested: string,
  destination?: StudioDestination,
): VeoGenerationParams {
  if (requested === "9:16" || requested === "16:9") {
    return { aspectRatio: requested, requestedAspectRatio: requested };
  }

  if (requested === "1:1") {
    return {
      aspectRatio: "16:9",
      requestedAspectRatio: requested,
      aspectRatioNote:
        "Veo supports 9:16 and 16:9 only. Requested 1:1 — using 16:9 with destination prompt guidance for square product framing.",
    };
  }

  if (destination?.width && destination.height) {
    const ratio = destination.width / destination.height;
    const mapped: VeoAspectRatio = ratio < 1 ? "9:16" : "16:9";
    return {
      aspectRatio: mapped,
      requestedAspectRatio: requested,
      aspectRatioNote: `Veo supports 9:16 and 16:9 only. Requested ${requested} — using nearest supported ${mapped}.`,
    };
  }

  return {
    aspectRatio: "16:9",
    requestedAspectRatio: requested,
    aspectRatioNote: `Veo supports 9:16 and 16:9 only. Requested ${requested} — using 16:9.`,
  };
}

export function resolveVeoGenerationParams(
  destination: StudioDestination | null | undefined,
): VeoGenerationParams {
  if (!destination) {
    return {
      aspectRatio: "16:9",
      requestedAspectRatio: "16:9",
      aspectRatioNote: "No destination provided; defaulting to 16:9.",
    };
  }

  const platform = normalizePlatform(destination.platform);
  const requested = destination.aspectRatio || "16:9";

  switch (platform) {
    case "tiktok":
      return { aspectRatio: "9:16", requestedAspectRatio: requested || "9:16" };
    case "instagram reels":
      return { aspectRatio: "9:16", requestedAspectRatio: requested || "9:16" };
    case "youtube":
      return { aspectRatio: "16:9", requestedAspectRatio: requested || "16:9" };
    case "website":
      return { aspectRatio: "16:9", requestedAspectRatio: requested || "16:9" };
    case "amazon":
    case "mercado libre":
      return {
        aspectRatio: "16:9",
        requestedAspectRatio: requested || "1:1",
        aspectRatioNote:
          "Veo does not support 1:1 video. Using 16:9 output with marketplace-focused prompt guidance.",
      };
    case "custom":
      return mapAspectRatioStringToVeo(requested, destination);
    default:
      return mapAspectRatioStringToVeo(requested, destination);
  }
}

export function buildDestinationVideoPromptBlock(
  destination: StudioDestination | null | undefined,
): string {
  if (!destination) return "";

  const platform = normalizePlatform(destination.platform);
  const aspectRatio = destination.aspectRatio;

  switch (platform) {
    case "tiktok":
      return `Publishing destination: TikTok
Generate a commercial optimized for TikTok.
Vertical 9:16.
Strong first two seconds.
Mobile-first composition.
Subject centered.
Safe margins.`;
    case "instagram reels":
      return `Publishing destination: Instagram Reels
Generate a commercial optimized for Instagram Reels.
Vertical 9:16.
Fast pacing.`;
    case "youtube":
      return `Publishing destination: YouTube
Generate a commercial optimized for YouTube.
Horizontal 16:9.
Cinematic composition.`;
    case "amazon":
      return `Publishing destination: Amazon
Generate a commercial optimized for Amazon product pages.
Square 1:1.
Product always visible.
Minimal camera movement.`;
    case "mercado libre":
      return `Publishing destination: Mercado Libre
Generate a commercial optimized for Mercado Libre.
Square 1:1.
Product-focused.`;
    case "website":
      return `Publishing destination: Website
Generate a commercial optimized for a website.
Horizontal 16:9.
Premium cinematic look.`;
    case "custom":
      return `Publishing destination: Custom
Use the custom aspect ratio selected by the user (${aspectRatio}).`;
    default:
      return `Publishing destination: ${destination.platform}
Optimize for ${destination.platform}.
Target aspect ratio: ${aspectRatio}.`;
  }
}

export function buildDestinationImagePromptBlock(
  destination: StudioDestination | null | undefined,
): string {
  if (!destination) return "";

  const videoBlock = buildDestinationVideoPromptBlock(destination);
  return `${videoBlock}

Adapt the hero image framing and composition for this publishing destination while preserving exact product identity.`;
}

export function logDestinationGenerationDebug(input: {
  stage: "image" | "video" | "premium-video";
  destination: StudioDestination | null;
  veoParams?: VeoGenerationParams;
  finalPrompt: string;
  generationParameters?: Record<string, unknown>;
}): void {
  console.log(
    "[Metaprom Destination Generation]",
    JSON.stringify(
      {
        stage: input.stage,
        destinationSelected: input.destination?.platform ?? null,
        aspectRatio: input.destination?.aspectRatio ?? null,
        veoAspectRatio: input.veoParams?.aspectRatio ?? null,
        aspectRatioNote: input.veoParams?.aspectRatioNote ?? null,
        finalPrompt: input.finalPrompt,
        generationParameters: input.generationParameters ?? null,
      },
      null,
      2,
    ),
  );
}
