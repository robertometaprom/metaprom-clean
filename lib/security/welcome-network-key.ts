import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { getClientIp } from "@/lib/security/rate-limit";

export const WELCOME_ADVERTISING_IMAGE_PRODUCT_ID =
  "welcome_advertising_image" as const;

/** Default anti-abuse cooldown for free welcome grants: 30 days. */
export const WELCOME_NETWORK_COOLDOWN_HOURS = 720;

/**
 * Normalize a trusted request IP for HMAC input.
 * Never persist the raw value — hash only.
 */
export function normalizeClientIp(ip: string): string {
  const trimmed = ip.trim().toLowerCase();
  if (!trimmed || trimmed === "unknown") {
    return "unknown";
  }

  // Strip IPv4-mapped IPv6 prefix (::ffff:1.2.3.4).
  if (trimmed.startsWith("::ffff:")) {
    return trimmed.slice("::ffff:".length);
  }

  return trimmed;
}

function getWelcomeAbuseHmacSecret(): string {
  const secret = process.env.WELCOME_ABUSE_HMAC_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error(
      "WELCOME_ABUSE_HMAC_SECRET must be set to a strong server-only secret (min 32 chars).",
    );
  }
  return secret;
}

/**
 * Derive a durable anti-abuse network key from a trusted request IP.
 * Returns only the HMAC hex digest — never the raw IP.
 */
export function hashWelcomeNetworkKey(rawIp: string): string {
  const normalized = normalizeClientIp(rawIp);
  const secret = getWelcomeAbuseHmacSecret();
  return createHmac("sha256", secret).update(`welcome-ai:v1:${normalized}`).digest("hex");
}

/** Build network key from a Request using trusted proxy headers only. */
export function welcomeNetworkKeyFromRequest(request: Request): string {
  return hashWelcomeNetworkKey(getClientIp(request));
}

/** Constant-time hex compare for tests / guards (not for auth cookies). */
export function safeEqualHex(a: string, b: string): boolean {
  try {
    const left = Buffer.from(a, "hex");
    const right = Buffer.from(b, "hex");
    if (left.length === 0 || left.length !== right.length) return false;
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
}
