const PII_KEY_RE =
  /(email|e-mail|name|full_name|display_name|phone|tel|mobile|whatsapp|prompt|customer_?intent|instruction|image|photo|video|card|pan|cvc|cvv|password|secret|token|authorization|ip\b|address|recipient|contact)/i;

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /\+?\d[\d\s().-]{7,}\d/;

export const FUNNEL_METADATA_KEYS = new Set([
  "origin_kind",
  "share_channel",
  "share_slug",
  "generation",
  "parent_user_id",
  "product_id",
  "purchase_id",
  "amount_mxn",
  "currency",
  "session_id",
  "asset_id",
  "mode",
  "run_id",
  "landing_path",
  "referrer_host",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "attributed_to_share",
  "creation_kind",
  "checkout_kind",
  "entitlement_kind",
  "surface",
  "asset_type",
]);

const MAX_STRING = 64;

export function isProhibitedAnalyticsKey(key: string): boolean {
  return PII_KEY_RE.test(key);
}

export function looksLikeProhibitedValue(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }
  return EMAIL_RE.test(value) || PHONE_RE.test(value);
}

export function sanitizeFunnelMetadata(
  metadata: unknown,
): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (isProhibitedAnalyticsKey(key)) {
      continue;
    }
    if (!FUNNEL_METADATA_KEYS.has(key)) {
      continue;
    }
    if (value == null) {
      continue;
    }
    if (typeof value === "boolean" || typeof value === "number") {
      if (typeof value === "number" && !Number.isFinite(value)) {
        continue;
      }
      sanitized[key] = value;
      continue;
    }
    if (typeof value !== "string") {
      continue;
    }
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > MAX_STRING) {
      continue;
    }
    if (looksLikeProhibitedValue(trimmed)) {
      continue;
    }
    sanitized[key] = trimmed;
  }

  return sanitized;
}

export function metadataContainsProhibitedData(
  metadata: Record<string, unknown>,
): boolean {
  for (const [key, value] of Object.entries(metadata)) {
    if (isProhibitedAnalyticsKey(key) || looksLikeProhibitedValue(value)) {
      return true;
    }
  }
  return false;
}
