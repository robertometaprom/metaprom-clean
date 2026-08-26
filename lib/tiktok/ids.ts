export const TIKTOK_TTP_COOKIE_NAME = "_ttp";

export function tiktokLandingViewContentEventId(
  visitorId: string,
  sessionKey: string,
): string {
  return `landing_visit:${visitorId}:${sessionKey}`;
}

export function tiktokCompleteRegistrationEventId(userId: string): string {
  return `signup_completed:${userId}`;
}

export function tiktokInitiateCheckoutEventId(purchaseId: string | number): string {
  return `checkout_started:${String(purchaseId)}`;
}

export function tiktokPurchaseEventId(purchaseId: string | number): string {
  return `purchase_completed:${String(purchaseId)}`;
}

export function shouldEmitTikTokOnFunnelInsert(
  result: "inserted" | "duplicate" | "skipped" | "failed",
): boolean {
  return result === "inserted";
}

export function sanitizeTikTokClickId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 128) {
    return null;
  }
  if (/[&=<>@\s]/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

export function sanitizeTikTokTtp(value: unknown): string | null {
  return sanitizeTikTokClickId(value);
}

export function isSafeTikTokPixelId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9]{8,64}$/.test(value);
}
