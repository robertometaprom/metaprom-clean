"use client";

import { useEffect, useRef } from "react";
import { trackGrowthEvent } from "@/lib/growth/events";
import type { PublicPreviewKind } from "@/lib/preview/types";

const STORAGE_PREFIX = "mp.share_opened.";

type ShareOpenedBeaconProps = {
  shareSlug: string;
  assetType: PublicPreviewKind;
};

/**
 * Records one `share_opened` per tab session per slug.
 * Avoids Strict Mode / remount duplicate noise.
 */
export default function ShareOpenedBeacon({
  shareSlug,
  assetType,
}: ShareOpenedBeaconProps) {
  const sentRef = useRef(false);

  useEffect(() => {
    if (!shareSlug || sentRef.current) {
      return;
    }

    const key = `${STORAGE_PREFIX}${shareSlug}`;

    try {
      if (sessionStorage.getItem(key)) {
        sentRef.current = true;
        return;
      }
      sessionStorage.setItem(key, "1");
    } catch {
      // Private mode: ref still prevents remount duplicates.
    }

    sentRef.current = true;
    void trackGrowthEvent({
      shareSlug,
      eventType: "share_opened",
      metadata: {
        asset_type: assetType,
        surface: "public_page",
      },
    });
  }, [assetType, shareSlug]);

  return null;
}
