import { isValidShareSlug } from "@/lib/preview/share-slug";
import { normalizeShareChannel } from "@/lib/analytics/channel";
import { isUuid, isVisitorId } from "@/lib/analytics/ids";
import { sanitizeFunnelMetadata } from "@/lib/analytics/sanitize";

export const FUNNEL_EVENT_TYPES = [
  "landing_visit",
  "signup_completed",
  "creation_started",
  "creation_completed",
  "preview_viewed",
  "checkout_started",
  "purchase_completed",
  "premium_activated",
] as const;

export type FunnelEventType = (typeof FUNNEL_EVENT_TYPES)[number];

export const CLIENT_FUNNEL_EVENT_TYPES = [
  "landing_visit",
  "preview_viewed",
] as const;

export type ClientFunnelEventType = (typeof CLIENT_FUNNEL_EVENT_TYPES)[number];

export type FunnelEventInsert = {
  event_type: FunnelEventType;
  visitor_id: string | null;
  user_id: string | null;
  share_slug: string | null;
  idempotency_key: string;
  metadata: Record<string, unknown>;
};

export type UserAttributionInsert = {
  user_id: string;
  visitor_id: string | null;
  origin_kind: "direct" | "organic" | "utm" | "share";
  share_slug: string | null;
  share_channel: string | null;
  referrer_host: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  generation: number;
  parent_user_id: string | null;
};

const NEW_SIGNUP_WINDOW_MS = 10 * 60 * 1000;

export function isFunnelEventType(value: unknown): value is FunnelEventType {
  return (
    typeof value === "string" &&
    (FUNNEL_EVENT_TYPES as readonly string[]).includes(value)
  );
}

export function isClientFunnelEventType(
  value: unknown,
): value is ClientFunnelEventType {
  return (
    typeof value === "string" &&
    (CLIENT_FUNNEL_EVENT_TYPES as readonly string[]).includes(value)
  );
}

export function isNewAuthUser(
  createdAt: string | null | undefined,
  now = Date.now(),
): boolean {
  if (!createdAt) {
    return false;
  }
  const created = Date.parse(createdAt);
  if (!Number.isFinite(created)) {
    return false;
  }
  const age = now - created;
  return age >= 0 && age <= NEW_SIGNUP_WINDOW_MS;
}

export function funnelIdempotencyKey(
  eventType: FunnelEventType,
  uniquePart: string,
): string {
  return `${eventType}:${uniquePart}`;
}

export function parseClientFunnelEventRequest(
  body: unknown,
  visitorId: string | null,
): FunnelEventInsert | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }

  const record = body as Record<string, unknown>;
  const eventType = record.event_type ?? record.eventType;
  if (!isClientFunnelEventType(eventType)) {
    return null;
  }

  const shareSlugRaw =
    typeof record.share_slug === "string"
      ? record.share_slug
      : typeof record.shareSlug === "string"
        ? record.shareSlug
        : null;
  const shareSlug =
    shareSlugRaw && isValidShareSlug(shareSlugRaw) ? shareSlugRaw : null;

  const runId =
    typeof record.run_id === "string" && isUuid(record.run_id)
      ? record.run_id
      : typeof record.runId === "string" && isUuid(record.runId)
        ? record.runId
        : null;

  const assetId =
    typeof record.asset_id === "string" && isUuid(record.asset_id)
      ? record.asset_id
      : null;

  const metadata = sanitizeFunnelMetadata({
    ...(typeof record.metadata === "object" && record.metadata
      ? record.metadata
      : {}),
    ...(shareSlug ? { share_slug: shareSlug } : {}),
    ...(runId ? { run_id: runId } : {}),
    ...(assetId ? { asset_id: assetId } : {}),
  });

  const uniquePart =
    eventType === "landing_visit"
      ? `${visitorId ?? "anon"}:${typeof record.session_key === "string" ? record.session_key : ""}`
      : `${visitorId ?? "anon"}:${shareSlug ?? ""}:${assetId ?? runId ?? ""}`;

  if (eventType === "landing_visit" && !visitorId) {
    return null;
  }

  if (
    eventType === "preview_viewed" &&
    !assetId &&
    !runId &&
    !shareSlug
  ) {
    return null;
  }

  return {
    event_type: eventType,
    visitor_id: visitorId && isVisitorId(visitorId) ? visitorId : null,
    user_id: null,
    share_slug: shareSlug,
    idempotency_key: funnelIdempotencyKey(eventType, uniquePart),
    metadata: {
      ...metadata,
      ...(normalizeShareChannel(metadata.share_channel)
        ? { share_channel: normalizeShareChannel(metadata.share_channel) }
        : {}),
    },
  };
}
