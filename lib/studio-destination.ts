export type StudioDestinationAspectRatio =
  | "9:16"
  | "16:9"
  | "1:1"
  | "custom";

export type StudioDestination = {
  platform: string;
  aspectRatio: string;
  width?: number;
  height?: number;
};

export type DestinationOptionId =
  | "tiktok"
  | "instagram-reels"
  | "youtube"
  | "amazon"
  | "mercado-libre"
  | "website"
  | "other";

export type DestinationOption = {
  id: DestinationOptionId;
  emoji: string;
  platform: string;
  subtitle: string;
  aspectRatio: string;
  isCustom?: boolean;
};

export const DESTINATION_OPTIONS: DestinationOption[] = [
  {
    id: "tiktok",
    emoji: "📱",
    platform: "TikTok",
    subtitle: "Vertical • 9:16",
    aspectRatio: "9:16",
  },
  {
    id: "instagram-reels",
    emoji: "📸",
    platform: "Instagram Reels",
    subtitle: "Vertical • 9:16",
    aspectRatio: "9:16",
  },
  {
    id: "youtube",
    emoji: "▶️",
    platform: "YouTube",
    subtitle: "Horizontal • 16:9",
    aspectRatio: "16:9",
  },
  {
    id: "amazon",
    emoji: "🛒",
    platform: "Amazon",
    subtitle: "Marketplace • 1:1",
    aspectRatio: "1:1",
  },
  {
    id: "mercado-libre",
    emoji: "🛍️",
    platform: "Mercado Libre",
    subtitle: "Marketplace • 1:1",
    aspectRatio: "1:1",
  },
  {
    id: "website",
    emoji: "🌐",
    platform: "Website",
    subtitle: "Horizontal • 16:9",
    aspectRatio: "16:9",
  },
  {
    id: "other",
    emoji: "⚙️",
    platform: "Other Destination",
    subtitle: "Custom",
    aspectRatio: "9:16",
    isCustom: true,
  },
];

export const CUSTOM_ASPECT_PRESETS: {
  id: StudioDestinationAspectRatio;
  label: string;
  aspectRatio: string;
}[] = [
  { id: "9:16", label: "Vertical", aspectRatio: "9:16" },
  { id: "16:9", label: "Horizontal", aspectRatio: "16:9" },
  { id: "1:1", label: "Square", aspectRatio: "1:1" },
  { id: "custom", label: "Custom", aspectRatio: "custom" },
];

export function buildDestinationFromOption(
  option: DestinationOption,
  custom?: {
    aspectPreset: StudioDestinationAspectRatio;
    width?: number;
    height?: number;
  },
): StudioDestination {
  if (!option.isCustom) {
    return {
      platform: option.platform,
      aspectRatio: option.aspectRatio,
    };
  }

  const preset = custom?.aspectPreset ?? "9:16";

  if (preset === "custom") {
    return {
      platform: "Custom",
      aspectRatio: formatCustomAspectRatio(custom?.width, custom?.height),
      width: custom?.width,
      height: custom?.height,
    };
  }

  return {
    platform: "Custom",
    aspectRatio: preset,
  };
}

export function formatCustomAspectRatio(
  width?: number,
  height?: number,
): string {
  if (!width || !height || width <= 0 || height <= 0) {
    return "custom";
  }

  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
}

export function isDestinationComplete(
  optionId: DestinationOptionId | null,
  custom?: {
    aspectPreset: StudioDestinationAspectRatio;
    width?: number;
    height?: number;
  },
): boolean {
  if (!optionId) return false;

  const option = DESTINATION_OPTIONS.find((entry) => entry.id === optionId);
  if (!option) return false;
  if (!option.isCustom) return true;

  const preset = custom?.aspectPreset ?? "9:16";
  if (preset !== "custom") return true;

  return Boolean(
    custom?.width &&
      custom.height &&
      custom.width > 0 &&
      custom.height > 0,
  );
}
