"use client";

import { useEffect, useRef } from "react";
import { getOrCreateVisitorId } from "@/lib/analytics/browser";
import { trackClientFunnelEvent } from "@/lib/analytics/client";
import { trackTikTokPixelEvent } from "@/lib/tiktok/browser";
import { tiktokLandingViewContentEventId } from "@/lib/tiktok/ids";

const SESSION_KEY = "mp.landing_visit";

/**
 * One landing_visit per browser tab session. Does not fire on remounts.
 * TikTok ViewContent uses the same landing identity for Pixel deduplication.
 */
export default function LandingVisitBeacon() {
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) {
      return;
    }

    let sessionKey = "1";
    try {
      const existing = sessionStorage.getItem(SESSION_KEY);
      if (existing) {
        sentRef.current = true;
        return;
      }
      sessionKey = `${Date.now().toString(36)}`;
      sessionStorage.setItem(SESSION_KEY, sessionKey);
    } catch {
      // Private mode: ref still prevents Strict Mode remount duplicates.
    }

    sentRef.current = true;
    const visitorId = getOrCreateVisitorId();
    void trackClientFunnelEvent({
      eventType: "landing_visit",
      sessionKey,
      metadata: { landing_path: "/" },
    });
    if (visitorId) {
      trackTikTokPixelEvent({
        event: "ViewContent",
        eventId: tiktokLandingViewContentEventId(visitorId, sessionKey),
      });
    }
  }, []);

  return null;
}
