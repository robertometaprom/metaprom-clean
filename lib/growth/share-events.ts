import { analyticsChannelFromShareAction, normalizeShareChannel } from "@/lib/analytics/channel";
import { isVisitorId } from "@/lib/analytics/ids";
import { isValidShareSlug } from "@/lib/preview/share-slug";
import type { GrowthEventInsert } from "@/lib/growth/schema";
import type { GrowthEventType } from "@/lib/growth/events";

export const PERSISTED_SHARE_EVENT_TYPES = [
  "share_created",
  "share_opened",
  "share_cta_clicked",
] as const;

export type PersistedShareEventType = (typeof PERSISTED_SHARE_EVENT_TYPES)[number];

const ALLOWED_METADATA_KEYS = new Set(["channel", "surface", "asset_type", "device"]);
const ALLOWED_SURFACES = new Set([
  "menu",
  "review_cta",
  "desktop_qr",
  "handoff",
  "public_page",
]);
const ALLOWED_ASSET_TYPES = new Set(["commercial", "advertising_image"]);
const MAX_METADATA_VALUE_LENGTH = 64;

export function isPersistedShareEventType(
  value: unknown,
): value is PersistedShareEventType {
  return (
    value === "share_created" ||
    value === "share_opened" ||
    value === "share_cta_clicked"
  );
}

function sanitizeMetadata(metadata: unknown): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (!ALLOWED_METADATA_KEYS.has(key)) {
      continue;
    }
    if (typeof value !== "string") {
      continue;
    }
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > MAX_METADATA_VALUE_LENGTH) {
      continue;
    }

    if (key === "channel") {
      const channel =
        normalizeShareChannel(trimmed) ??
        (trimmed === "native" || trimmed === "desktop_qr_handoff"
          ? analyticsChannelFromShareAction(trimmed)
          : null);
      if (channel) {
        sanitized.channel = channel;
      }
      continue;
    }

    if (key === "surface" && !ALLOWED_SURFACES.has(trimmed)) {
      continue;
    }

    if (key === "asset_type" && !ALLOWED_ASSET_TYPES.has(trimmed)) {
      continue;
    }

    sanitized[key] = trimmed;
  }

  return sanitized;
}

/**
 * Accept only Share P1 events from the public client.
 * Rejects signup/funnel types so `signup_completed` / purchase cannot be faked here.
 */
export function parseShareEventRequest(body: unknown): GrowthEventInsert | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }

  const record = body as Record<string, unknown>;
  const shareSlug =
    typeof record.share_slug === "string"
      ? record.share_slug
      : typeof record.shareSlug === "string"
        ? record.shareSlug
        : "";
  const eventType = record.event_type ?? record.eventType;

  if (!isValidShareSlug(shareSlug) || !isPersistedShareEventType(eventType)) {
    return null;
  }

  const visitorRaw =
    typeof record.visitor_id === "string"
      ? record.visitor_id
      : typeof record.visitorId === "string"
        ? record.visitorId
        : null;

  return {
    share_slug: shareSlug,
    event_type: eventType as GrowthEventType,
    metadata: sanitizeMetadata(record.metadata),
    visitor_id: isVisitorId(visitorRaw) ? visitorRaw : null,
  };
}
