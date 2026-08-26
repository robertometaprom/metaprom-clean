import { isSafeTikTokPixelId, tiktokInitiateCheckoutEventId } from "@/lib/tiktok/ids";

type TikTokQueue = {
  ready?: (callback: () => void) => void;
  track?: (
    event: string,
    properties?: Record<string, unknown>,
    options?: { event_id?: string },
  ) => void;
};

declare global {
  interface Window {
    ttq?: TikTokQueue;
  }
}

export function getBrowserTikTokPixelId(): string | null {
  const value = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID?.trim() ?? "";
  return isSafeTikTokPixelId(value) ? value : null;
}

export function whenTikTokPixelReady(callback: () => void): void {
  try {
    if (typeof window === "undefined") {
      return;
    }

    const attach = (): boolean => {
      if (typeof window.ttq?.ready === "function") {
        window.ttq.ready(callback);
        return true;
      }
      return false;
    };

    if (attach()) {
      return;
    }

    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      if (attach() || Date.now() - startedAt > 10_000) {
        window.clearInterval(timer);
      }
    }, 50);
  } catch {
    // Observability only.
  }
}

export function trackTikTokPixelEvent(input: {
  event: "ViewContent" | "InitiateCheckout";
  eventId: string;
  properties?: Record<string, unknown>;
}): void {
  try {
    if (typeof window === "undefined" || !getBrowserTikTokPixelId() || !input.eventId) {
      return;
    }
    const properties = input.properties ?? {};
    window.ttq?.track?.(input.event, properties, { event_id: input.eventId });
  } catch {
    // Observability only.
  }
}

export function trackTikTokInitiateCheckoutPixel(input: {
  purchaseId: string | number | null | undefined;
  value?: number;
  currency?: string;
  contentId?: string | null;
}): void {
  if (input.purchaseId == null || input.purchaseId === "") {
    return;
  }

  const properties: Record<string, unknown> = {};
  if (typeof input.value === "number" && Number.isFinite(input.value)) {
    properties.value = input.value;
  }
  if (input.currency) {
    properties.currency = input.currency;
  }
  if (input.contentId) {
    properties.contents = [
      { content_id: input.contentId, content_type: "product" },
    ];
  }

  trackTikTokPixelEvent({
    event: "InitiateCheckout",
    eventId: tiktokInitiateCheckoutEventId(input.purchaseId),
    properties,
  });
}
