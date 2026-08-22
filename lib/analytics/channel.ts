import { isValidShareSlug } from "@/lib/preview/share-slug";

export const SHARE_CHANNEL_QUERY = "ch";

export const SHARE_CHANNELS = [
  "whatsapp",
  "copy_link",
  "sms",
  "native_share",
  "other",
] as const;

export type ShareChannel = (typeof SHARE_CHANNELS)[number];

const CHANNEL_CODES: Record<ShareChannel, string> = {
  whatsapp: "wa",
  copy_link: "cl",
  sms: "sms",
  native_share: "ns",
  other: "oth",
};

const CODE_TO_CHANNEL: Record<string, ShareChannel> = {
  wa: "whatsapp",
  whatsapp: "whatsapp",
  cl: "copy_link",
  copy: "copy_link",
  copy_link: "copy_link",
  sms: "sms",
  ns: "native_share",
  native: "native_share",
  native_share: "native_share",
  oth: "other",
  other: "other",
};

/**
 * Map an actual Share UI action onto the analytics channel enum.
 * Does not invent channels the product does not expose.
 */
export function analyticsChannelFromShareAction(
  action: string,
): ShareChannel {
  const trimmed = action.trim().toLowerCase();
  if (trimmed === "desktop_qr_handoff") {
    return "whatsapp";
  }
  return CODE_TO_CHANNEL[trimmed] ?? "other";
}

export function normalizeShareChannel(value: unknown): ShareChannel | null {
  if (typeof value !== "string") {
    return null;
  }

  const key = value.trim().toLowerCase();
  if (!key) {
    return null;
  }

  return CODE_TO_CHANNEL[key] ?? null;
}

export function shareChannelQueryValue(channel: ShareChannel): string {
  return CHANNEL_CODES[channel];
}

/**
 * Stamp a public Share URL with a channel code. Old URLs without `ch` stay valid.
 * Query values are normalized later; arbitrary strings are not treated as truth.
 */
export function appendShareChannelParam(
  publicPreviewUrl: string,
  channel: ShareChannel,
): string {
  try {
    const parsed = new URL(publicPreviewUrl);
    parsed.searchParams.set(SHARE_CHANNEL_QUERY, shareChannelQueryValue(channel));
    return parsed.toString();
  } catch {
    const separator = publicPreviewUrl.includes("?") ? "&" : "?";
    return `${publicPreviewUrl}${separator}${SHARE_CHANNEL_QUERY}=${shareChannelQueryValue(channel)}`;
  }
}

export function readShareChannelFromSearchParams(
  searchParams: { get(name: string): string | null },
): ShareChannel | null {
  return normalizeShareChannel(searchParams.get(SHARE_CHANNEL_QUERY));
}

export function matchPublicShareSlug(pathname: string): string | null {
  const match = pathname.match(
    /^\/p\/([23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{11})$/,
  );
  const slug = match?.[1] ?? null;
  if (!slug || !isValidShareSlug(slug)) {
    return null;
  }
  return slug;
}
