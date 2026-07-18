import type { GrowthEventInsert } from "@/lib/growth/schema";

export type GrowthEventType =
  | "view"
  | "unique_view"
  | "share"
  | "share_whatsapp"
  | "share_copy"
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

/** Maps client event shape to `growth_events` insert row (PR6). */
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
 * RC1.3.5 PR1b — persistence wired in PR6 via service role.
 * Schema: `public.growth_events` (see supabase/migrations/20260717120000_growth_engine_foundation.sql).
 */
export async function trackGrowthEvent(event: GrowthEvent): Promise<void> {
  void toGrowthEventInsert(event);
  // no-op until analytics PR
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
