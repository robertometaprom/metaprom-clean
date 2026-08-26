import "server-only";

import { getPublicAppOrigin, getTikTokPixelId } from "@/lib/tiktok/config";
import { sanitizeTikTokClickId, sanitizeTikTokTtp } from "@/lib/tiktok/ids";

const TIKTOK_EVENTS_API_URL =
  "https://business-api.tiktok.com/open_api/v1.3/event/track/";
const REQUEST_TIMEOUT_MS = 2500;

function getTikTokEventsApiAccessToken(): string | null {
  const token = process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN?.trim() ?? "";
  return token.length > 0 ? token : null;
}

export type TikTokServerEventName =
  | "CompleteRegistration"
  | "InitiateCheckout"
  | "Purchase";

export type TikTokServerUser = {
  ttclid?: string | null;
  ttp?: string | null;
};

export type TikTokServerProperties = {
  value?: number;
  currency?: string;
  contentId?: string | null;
  contentType?: string;
  contentName?: string | null;
};

export type TrackTikTokServerEventInput = {
  event: TikTokServerEventName;
  eventId: string;
  eventTime?: number;
  pageUrl?: string | null;
  user?: TikTokServerUser;
  properties?: TikTokServerProperties;
  fetchImpl?: typeof fetch;
};

function pageUrlOrNull(pageUrl: string | null | undefined): string | null {
  if (typeof pageUrl === "string" && pageUrl.startsWith("https://")) {
    return pageUrl.slice(0, 2048);
  }
  const origin = getPublicAppOrigin();
  if (origin && pageUrl && pageUrl.startsWith("/")) {
    return `${origin}${pageUrl}`.slice(0, 2048);
  }
  return origin;
}

function buildUser(user: TikTokServerUser | undefined) {
  const ttclid = sanitizeTikTokClickId(user?.ttclid);
  const ttp = sanitizeTikTokTtp(user?.ttp);
  const payload: Record<string, string> = {};
  if (ttclid) payload.ttclid = ttclid;
  if (ttp) payload.ttp = ttp;
  return payload;
}

function buildProperties(properties: TikTokServerProperties | undefined) {
  if (!properties) {
    return {};
  }

  const payload: Record<string, unknown> = {};
  if (
    typeof properties.value === "number" &&
    Number.isFinite(properties.value)
  ) {
    payload.value = properties.value;
  }
  if (typeof properties.currency === "string" && properties.currency.trim()) {
    payload.currency = properties.currency.trim().toUpperCase();
  }
  if (properties.contentId) {
    payload.contents = [
      {
        content_id: String(properties.contentId).slice(0, 64),
        content_type: properties.contentType ?? "product",
        ...(properties.contentName
          ? { content_name: String(properties.contentName).slice(0, 64) }
          : {}),
      },
    ];
  }
  return payload;
}

/**
 * Observability-only TikTok Events API. Never throws to callers.
 */
export async function trackTikTokServerEvent(
  input: TrackTikTokServerEventInput,
): Promise<"sent" | "skipped" | "failed"> {
  try {
    const pixelId = getTikTokPixelId();
    const accessToken = getTikTokEventsApiAccessToken();
    if (!pixelId || !accessToken || !input.eventId) {
      return "skipped";
    }

    const eventTime = Math.floor(
      (input.eventTime ?? Date.now()) / 1000,
    );
    const page = pageUrlOrNull(input.pageUrl);
    const user = buildUser(input.user);
    const properties = buildProperties(input.properties);

    const body = {
      event_source: "web",
      event_source_id: pixelId,
      data: [
        {
          event: input.event,
          event_time: eventTime,
          event_id: input.eventId,
          user,
          ...(page ? { page: { url: page } } : {}),
          properties,
        },
      ],
    };

    const serialized = JSON.stringify(body);
    const fetchImpl = input.fetchImpl ?? fetch;
    const response = await fetchImpl(TIKTOK_EVENTS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Access-Token": accessToken,
      },
      body: serialized,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error("tiktok events api http error", {
        event: input.event,
        eventId: input.eventId,
        status: response.status,
      });
      return "failed";
    }

    return "sent";
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    if (/TIKTOK_EVENTS_API_ACCESS_TOKEN|Access-Token/i.test(message)) {
      console.error("tiktok events api failed", {
        event: input.event,
        eventId: input.eventId,
      });
    } else {
      console.error("tiktok events api failed", {
        event: input.event,
        eventId: input.eventId,
        message,
      });
    }
    return "failed";
  }
}

export function tiktokUserFromPurchaseMetadata(
  metadata: Record<string, unknown> | null | undefined,
): TikTokServerUser {
  if (!metadata || typeof metadata !== "object") {
    return {};
  }
  return {
    ttclid:
      typeof metadata.tiktokTtclid === "string" ? metadata.tiktokTtclid : null,
    ttp: typeof metadata.tiktokTtp === "string" ? metadata.tiktokTtp : null,
  };
}
