"use client";

import { getOrCreateVisitorId } from "@/lib/analytics/browser";
import type { ClientFunnelEventType } from "@/lib/analytics/events";

export async function trackClientFunnelEvent(input: {
  eventType: ClientFunnelEventType;
  shareSlug?: string | null;
  assetId?: string | null;
  runId?: string | null;
  sessionKey?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  const visitorId = getOrCreateVisitorId();

  try {
    await fetch("/api/analytics/client-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: input.eventType,
        visitor_id: visitorId,
        share_slug: input.shareSlug ?? null,
        asset_id: input.assetId ?? null,
        run_id: input.runId ?? null,
        session_key: input.sessionKey ?? null,
        metadata: input.metadata ?? {},
      }),
      keepalive: true,
    });
  } catch {
    // Product UX must not depend on analytics.
  }
}
