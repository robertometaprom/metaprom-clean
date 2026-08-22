"use client";

import { useEffect, useRef } from "react";
import { trackClientFunnelEvent } from "@/lib/analytics/client";
import { isValidShareSlug } from "@/lib/preview/share-slug";
import { isUuid } from "@/lib/analytics/ids";

type PreviewViewedInput = {
  phase: string;
  videoUrl: string | null;
  premiumImage: string | null;
  assetId: string | null;
  shareSlug: string | null;
  creationMode: "commercial" | "advertising_image" | null;
  runId: string | null;
  skip?: boolean;
};

/**
 * Fires preview_viewed once the generated result is actually visible.
 * Skips the local UX4A mock review.
 */
export function usePreviewViewedAnalytics(input: PreviewViewedInput) {
  const sentRef = useRef(false);

  useEffect(() => {
    if (input.skip || sentRef.current) {
      return;
    }

    const commercialReady = input.phase === "preview" && Boolean(input.videoUrl);
    const imageReady =
      input.phase === "image_result" && Boolean(input.premiumImage);

    if (!commercialReady && !imageReady) {
      return;
    }

    const mode =
      input.creationMode ??
      (imageReady ? "advertising_image" : "commercial");
    const assetId = input.assetId && isUuid(input.assetId) ? input.assetId : null;
    const runId = input.runId && isUuid(input.runId) ? input.runId : null;
    const shareSlug =
      input.shareSlug && isValidShareSlug(input.shareSlug)
        ? input.shareSlug
        : null;

    if (!assetId && !runId && !shareSlug) {
      return;
    }

    const dedupeKey = `mp.preview_viewed.${assetId ?? runId ?? shareSlug}`;
    try {
      if (sessionStorage.getItem(dedupeKey)) {
        sentRef.current = true;
        return;
      }
      sessionStorage.setItem(dedupeKey, "1");
    } catch {
      // Private mode.
    }

    sentRef.current = true;
    void trackClientFunnelEvent({
      eventType: "preview_viewed",
      shareSlug,
      assetId,
      runId,
      metadata: {
        mode,
        creation_kind: mode,
      },
    });
  }, [
    input.assetId,
    input.creationMode,
    input.phase,
    input.premiumImage,
    input.runId,
    input.shareSlug,
    input.skip,
    input.videoUrl,
  ]);
}
