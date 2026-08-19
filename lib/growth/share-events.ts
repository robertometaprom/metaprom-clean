import { isValidShareSlug } from "@/lib/preview/share-slug";
import type { GrowthEventInsert } from "@/lib/growth/schema";
import type { GrowthEventType } from "@/lib/growth/events";

export const PERSISTED_SHARE_EVENT_TYPES = [
  "share_created",
  "share_opened",
] as const;

export type PersistedShareEventType = (typeof PERSISTED_SHARE_EVENT_TYPES)[number];

const ALLOWED_METADATA_KEYS = new Set(["channel", "surface", "asset_type", "device"]);
const MAX_METADATA_VALUE_LENGTH = 64;

export function isPersistedShareEventType(
  value: unknown,
): value is PersistedShareEventType {
  return (
    value === "share_created" || value === "share_opened"
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
    sanitized[key] = trimmed;
  }

  return sanitized;
}

/**
 * Accept only the Share P1 events from the public client.
 * Rejects signup/funnel types so `share_to_signup` cannot be faked here.
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

  return {
    share_slug: shareSlug,
    event_type: eventType as GrowthEventType,
    metadata: sanitizeMetadata(record.metadata),
    visitor_id: null,
  };
}
