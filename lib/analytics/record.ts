import "server-only";

import type { AcquisitionState } from "@/lib/analytics/attribution";
import { isShareAttributed } from "@/lib/analytics/attribution";
import {
  funnelIdempotencyKey,
  isNewAuthUser,
  type FunnelEventInsert,
} from "@/lib/analytics/events";
import { isUuid, isVisitorId } from "@/lib/analytics/ids";
import {
  attributionMetadataForUser,
  insertFunnelEvent,
  insertUserAttribution,
  resolveShareGeneration,
  type FunnelStore,
} from "@/lib/analytics/persist";
import { sanitizeFunnelMetadata } from "@/lib/analytics/sanitize";

async function safeInsert(
  row: FunnelEventInsert,
  store?: FunnelStore,
): Promise<"inserted" | "duplicate" | "failed" | "skipped"> {
  return insertFunnelEvent(
    {
      ...row,
      metadata: sanitizeFunnelMetadata(row.metadata),
    },
    store,
  );
}

export async function recordLandingVisit(input: {
  visitorId: string;
  sessionKey: string;
  acquisition: AcquisitionState | null;
  store?: FunnelStore;
}): Promise<"inserted" | "duplicate" | "failed" | "skipped"> {
  if (!isVisitorId(input.visitorId) || !input.sessionKey) {
    return "failed";
  }

  const origin = input.acquisition?.origin ?? null;
  const share = input.acquisition?.share ?? null;

  return safeInsert(
    {
      event_type: "landing_visit",
      visitor_id: input.visitorId,
      user_id: null,
      share_slug: share?.shareSlug ?? origin?.shareSlug ?? null,
      idempotency_key: funnelIdempotencyKey(
        "landing_visit",
        `${input.visitorId}:${input.sessionKey}`,
      ),
      metadata: {
        landing_path: "/",
        origin_kind: origin?.kind ?? "direct",
        ...(origin?.referrerHost ? { referrer_host: origin.referrerHost } : {}),
        ...(origin?.utmSource ? { utm_source: origin.utmSource } : {}),
        ...(origin?.utmMedium ? { utm_medium: origin.utmMedium } : {}),
        ...(origin?.utmCampaign ? { utm_campaign: origin.utmCampaign } : {}),
        ...(share?.shareChannel ? { share_channel: share.shareChannel } : {}),
        attributed_to_share: Boolean(share),
      },
    },
    input.store,
  );
}

export async function recordSignupCompleted(input: {
  userId: string;
  createdAt: string | null | undefined;
  visitorId: string | null;
  acquisition: AcquisitionState | null;
  store?: FunnelStore;
}): Promise<"inserted" | "duplicate" | "skipped" | "failed"> {
  if (!isUuid(input.userId) || !isNewAuthUser(input.createdAt)) {
    return "skipped";
  }

  const share = await resolveShareGeneration({
    acquisition: input.acquisition,
    store: input.store,
  });
  const origin = input.acquisition?.origin;
  const attributed = isShareAttributed(input.acquisition);

  await insertUserAttribution(
    {
      user_id: input.userId,
      visitor_id: input.visitorId && isVisitorId(input.visitorId) ? input.visitorId : null,
      origin_kind: origin?.kind ?? (attributed ? "share" : "direct"),
      share_slug: share.shareSlug,
      share_channel: share.shareChannel,
      referrer_host: origin?.referrerHost ?? null,
      utm_source: origin?.utmSource ?? null,
      utm_medium: origin?.utmMedium ?? null,
      utm_campaign: origin?.utmCampaign ?? null,
      generation: share.generation,
      parent_user_id: share.parentUserId,
    },
    input.store,
  );

  return safeInsert(
    {
      event_type: "signup_completed",
      visitor_id: input.visitorId && isVisitorId(input.visitorId) ? input.visitorId : null,
      user_id: input.userId,
      share_slug: share.shareSlug,
      idempotency_key: funnelIdempotencyKey("signup_completed", input.userId),
      metadata: {
        origin_kind: origin?.kind ?? (attributed ? "share" : "direct"),
        attributed_to_share: attributed,
        generation: share.generation,
        ...(share.shareChannel ? { share_channel: share.shareChannel } : {}),
        ...(share.parentUserId ? { parent_user_id: share.parentUserId } : {}),
        ...(origin?.utmSource ? { utm_source: origin.utmSource } : {}),
        ...(origin?.utmMedium ? { utm_medium: origin.utmMedium } : {}),
        ...(origin?.utmCampaign ? { utm_campaign: origin.utmCampaign } : {}),
        ...(origin?.referrerHost ? { referrer_host: origin.referrerHost } : {}),
      },
    },
    input.store,
  );
}

export async function recordCreationStarted(input: {
  runId: string;
  userId?: string | null;
  visitorId?: string | null;
  mode: "commercial" | "advertising_image";
  store?: FunnelStore;
}): Promise<"inserted" | "duplicate" | "failed" | "skipped"> {
  if (!isUuid(input.runId)) {
    return "failed";
  }

  const userId = input.userId && isUuid(input.userId) ? input.userId : null;
  const snapshot = await attributionMetadataForUser(userId, input.store);

  return safeInsert(
    {
      event_type: "creation_started",
      visitor_id: input.visitorId && isVisitorId(input.visitorId) ? input.visitorId : null,
      user_id: userId,
      share_slug:
        typeof snapshot.share_slug === "string" ? snapshot.share_slug : null,
      idempotency_key: funnelIdempotencyKey("creation_started", input.runId),
      metadata: {
        ...snapshot,
        mode: input.mode,
        creation_kind: input.mode,
        run_id: input.runId,
      },
    },
    input.store,
  );
}

export async function recordCreationCompleted(input: {
  runId: string;
  userId?: string | null;
  visitorId?: string | null;
  mode: "commercial" | "advertising_image";
  assetId?: string | null;
  store?: FunnelStore;
}): Promise<"inserted" | "duplicate" | "failed" | "skipped"> {
  if (!isUuid(input.runId)) {
    return "failed";
  }

  const userId = input.userId && isUuid(input.userId) ? input.userId : null;
  const snapshot = await attributionMetadataForUser(userId, input.store);

  return safeInsert(
    {
      event_type: "creation_completed",
      visitor_id: input.visitorId && isVisitorId(input.visitorId) ? input.visitorId : null,
      user_id: userId,
      share_slug:
        typeof snapshot.share_slug === "string" ? snapshot.share_slug : null,
      idempotency_key: funnelIdempotencyKey("creation_completed", input.runId),
      metadata: {
        ...snapshot,
        mode: input.mode,
        creation_kind: input.mode,
        run_id: input.runId,
        ...(input.assetId && isUuid(input.assetId) ? { asset_id: input.assetId } : {}),
      },
    },
    input.store,
  );
}

export async function recordCheckoutStarted(input: {
  userId: string;
  purchaseId: string | number;
  productId: string;
  amountMxn: number;
  currency: "MXN";
  sessionId: string;
  assetId?: string | null;
  store?: FunnelStore;
}): Promise<"inserted" | "duplicate" | "failed" | "skipped"> {
  if (!isUuid(input.userId) || !input.sessionId || !input.productId) {
    return "failed";
  }

  const purchaseId = String(input.purchaseId);
  const snapshot = await attributionMetadataForUser(input.userId, input.store);

  return safeInsert(
    {
      event_type: "checkout_started",
      visitor_id: null,
      user_id: input.userId,
      share_slug:
        typeof snapshot.share_slug === "string" ? snapshot.share_slug : null,
      idempotency_key: funnelIdempotencyKey("checkout_started", purchaseId),
      metadata: {
        ...snapshot,
        product_id: input.productId,
        purchase_id: purchaseId.slice(0, 64),
        amount_mxn: input.amountMxn,
        currency: input.currency,
        session_id: input.sessionId.slice(0, 64),
        checkout_kind: "package",
        ...(input.assetId && isUuid(input.assetId) ? { asset_id: input.assetId } : {}),
      },
    },
    input.store,
  );
}

export async function recordPurchaseCompleted(input: {
  userId: string;
  purchaseId: string | number;
  productId: string;
  amountMxn?: number;
  currency?: string;
  sessionId?: string | null;
  store?: FunnelStore;
}): Promise<"inserted" | "duplicate" | "failed" | "skipped"> {
  if (!isUuid(input.userId) || input.purchaseId == null) {
    return "failed";
  }

  const purchaseId = String(input.purchaseId);
  const snapshot = await attributionMetadataForUser(input.userId, input.store);

  return safeInsert(
    {
      event_type: "purchase_completed",
      visitor_id: null,
      user_id: input.userId,
      share_slug:
        typeof snapshot.share_slug === "string" ? snapshot.share_slug : null,
      idempotency_key: funnelIdempotencyKey("purchase_completed", purchaseId),
      metadata: {
        ...snapshot,
        product_id: input.productId,
        purchase_id: purchaseId.slice(0, 64),
        ...(typeof input.amountMxn === "number" ? { amount_mxn: input.amountMxn } : {}),
        currency: input.currency === "MXN" ? "MXN" : undefined,
        ...(input.sessionId ? { session_id: input.sessionId.slice(0, 64) } : {}),
      },
    },
    input.store,
  );
}

export async function recordPremiumActivated(input: {
  userId: string;
  purchaseId: string | number;
  productId: string;
  store?: FunnelStore;
}): Promise<"inserted" | "duplicate" | "failed" | "skipped"> {
  if (!isUuid(input.userId)) {
    return "failed";
  }

  const snapshot = await attributionMetadataForUser(input.userId, input.store);

  return safeInsert(
    {
      event_type: "premium_activated",
      visitor_id: null,
      user_id: input.userId,
      share_slug:
        typeof snapshot.share_slug === "string" ? snapshot.share_slug : null,
      idempotency_key: funnelIdempotencyKey("premium_activated", input.userId),
      metadata: {
        ...snapshot,
        product_id: input.productId,
        purchase_id: String(input.purchaseId).slice(0, 64),
        entitlement_kind: input.productId.startsWith("assets_")
          ? "advertising_asset"
          : "commercial",
      },
    },
    input.store,
  );
}

export async function recordPreviewViewed(input: FunnelEventInsert, store?: FunnelStore) {
  return safeInsert(input, store);
}
