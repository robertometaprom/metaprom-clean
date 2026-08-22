import { getOrCreateVisitorId } from "@/lib/analytics/browser";
import type { GrowthEventInsert } from "@/lib/growth/schema";

export type GrowthEventType =
  | "view"
  | "unique_view"
  | "share"
  | "share_whatsapp"
  | "share_copy"
  | "share_created"
  | "share_opened"
  | "share_cta_clicked"
  | "cta_click"
  | "registration"
  | "conversion"
  | "watch_completion";

export type GrowthEventMetadata = {
  watchCompletionPercent?: number;
  referrer?: string;
  visitorId?: string;
  [key: string]: unknown;
};

export type GrowthEvent = {
  shareSlug: string;
  eventType: GrowthEventType;
  metadata?: GrowthEventMetadata;
};

/** Maps client event shape to `growth_events` insert row. */
export function toGrowthEventInsert(event: GrowthEvent): GrowthEventInsert {
  return {
    share_slug: event.shareSlug,
    event_type: event.eventType,
    metadata: event.metadata ?? {},
    visitor_id:
      typeof event.metadata?.visitorId === "string"
        ? event.metadata.visitorId
        : null,
  };
}

/**
 * Persist Share P1 events (`share_created`, `share_opened`) via the
 * existing `growth_events` table. Failures never block sharing UX.
 */
export async function trackGrowthEvent(event: GrowthEvent): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  const visitorId = getOrCreateVisitorId();
  const row = {
    ...toGrowthEventInsert(event),
    visitor_id: visitorId,
  };

  try {
    await fetch("/api/growth/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row),
      keepalive: true,
    });
  } catch {
    // Share UX must not depend on analytics.
  }
}

export type WatchCompletionEvent = {
  shareSlug: string;
  watchCompletionPercent: number;
  metadata?: Omit<GrowthEventMetadata, "watchCompletionPercent">;
};

export async function trackWatchCompletion(
  event: WatchCompletionEvent,
): Promise<void> {
  await trackGrowthEvent({
    shareSlug: event.shareSlug,
    eventType: "watch_completion",
    metadata: {
      ...event.metadata,
      watchCompletionPercent: event.watchCompletionPercent,
    },
  });
}
