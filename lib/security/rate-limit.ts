import "server-only";

/**
 * Request IP helpers.
 *
 * Process-memory counters in this file are NOT durable across Vercel
 * instances. Generation/cost limits live in `lib/security/cost-control.ts`
 * and `provider_cost_windows` (Supabase). Do not use `checkRateLimit` for
 * paid-provider protection.
 */

import { RATE_LIMIT_WINDOW_MS } from "@/lib/security/limits";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

export type RateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterMs: number };

function pruneExpiredBuckets(now: number) {
  if (buckets.size < 500) return;

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number = RATE_LIMIT_WINDOW_MS,
): RateLimitResult {
  const now = Date.now();
  pruneExpiredBuckets(now);

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });

    return { allowed: true, remaining: limit - 1 };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      retryAfterMs: Math.max(existing.resetAt - now, 1),
    };
  }

  existing.count += 1;
  buckets.set(key, existing);

  return { allowed: true, remaining: limit - existing.count };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
}

export function buildRateLimitKey(scope: string, request: Request): string {
  return `${scope}:${getClientIp(request)}`;
}
