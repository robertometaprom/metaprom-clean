import "server-only";

import { createHmac } from "node:crypto";

import {
  PREMIUM_GENERATION_LOCK_TTL_MS,
  RATE_LIMIT_WINDOW_MS,
} from "@/lib/security/limits";
import {
  COST_CONTROL_UNAVAILABLE_CODE,
  COST_CONTROL_UNAVAILABLE_MESSAGE,
  GENERATION_IN_PROGRESS_CODE,
  GENERATION_IN_PROGRESS_MESSAGE,
  RATE_LIMITED_ANON_DIRECTOR_MESSAGE,
  RATE_LIMITED_CODE,
  RATE_LIMITED_CONVERSATION_MESSAGE,
  RATE_LIMITED_DRAFT_MESSAGE,
  RATE_LIMITED_GENERATION_MESSAGE,
} from "@/lib/security/cost-control-messages";
import { getClientIp } from "@/lib/security/rate-limit";
import { normalizeClientIp } from "@/lib/security/welcome-network-key";

export type CostControlEndpointClass =
  | "director"
  | "draft-read"
  | "draft-save"
  | "video-teaser"
  | "enhancement-preview"
  | "enhancement-advertising"
  | "premium-video";

export type CostControlPolicy = "fail-closed" | "fail-open";

export type CostControlConsumeResult =
  | { allowed: true; remaining: number; storageFailure?: false }
  | {
      allowed: false;
      retryAfterMs: number;
      storageFailure?: boolean;
    };

export type CostControlLockResult = {
  claimed: boolean;
  retryAfterMs: number;
  storageFailure?: boolean;
};

export type CostControlStore = {
  consume(input: {
    endpointClass: CostControlEndpointClass;
    bucketKey: string;
    limit: number;
    windowMs: number;
  }): Promise<CostControlConsumeResult>;
  tryClaim(input: {
    lockKey: string;
    ttlMs: number;
  }): Promise<CostControlLockResult>;
  release(lockKey: string): Promise<void>;
};

const ENDPOINT_CLASS_RE = /^[a-z0-9-]{1,64}$/;
const HEX_64_RE = /^[a-f0-9]{64}$/;

let installedStore: CostControlStore | null = null;
const developmentMemoryStore = createMemoryCostControlStore();

function getHmacSecret(): string | null {
  const secret =
    process.env.COST_CONTROL_HMAC_SECRET?.trim() ||
    process.env.WELCOME_ABUSE_HMAC_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "";

  return secret.length >= 16 ? secret : null;
}

function hashIdentity(kind: string, value: string): string {
  const secret =
    getHmacSecret() ?? "metaprom-cost-control-dev-hmac-secret!";
  return createHmac("sha256", secret)
    .update(`cost-control:v1:${kind}:${value}`)
    .digest("hex");
}

export function hashCostControlBucketKey(input: {
  userId?: string | null;
  ip: string;
}): string {
  if (input.userId?.trim()) {
    return hashIdentity("user", input.userId.trim());
  }

  return hashIdentity("ip", normalizeClientIp(input.ip));
}

export function hashCostControlLockKey(scope: string, assetId: string): string {
  return hashIdentity("lock", `${scope}:${assetId}`);
}

export function getCostControlStore(): CostControlStore {
  if (installedStore) return installedStore;
  if (process.env.NODE_ENV === "production") {
    return supabaseCostControlStore;
  }
  return developmentMemoryStore;
}

export function installCostControlStoreForTests(store: CostControlStore | null) {
  installedStore = store;
}

export function createMemoryCostControlStore(): CostControlStore {
  const windows = new Map<
    string,
    { count: number; resetAt: number; lastDecision: "allowed" | "blocked" }
  >();
  const locks = new Map<string, number>();

  return {
    async consume(input) {
      const now = Date.now();
      const key = `${input.endpointClass}:${input.bucketKey}:${input.windowMs}`;
      const existing = windows.get(key);

      if (!existing || existing.resetAt <= now) {
        windows.set(key, {
          count: 1,
          resetAt: now + input.windowMs,
          lastDecision: "allowed",
        });
        return { allowed: true, remaining: input.limit - 1 };
      }

      existing.count += 1;
      const allowed = existing.count <= input.limit;
      existing.lastDecision = allowed ? "allowed" : "blocked";
      windows.set(key, existing);

      if (!allowed) {
        return {
          allowed: false,
          retryAfterMs: Math.max(existing.resetAt - now, 1),
        };
      }

      return { allowed: true, remaining: input.limit - existing.count };
    },

    async tryClaim(input) {
      const now = Date.now();
      const expiresAt = locks.get(input.lockKey);

      if (expiresAt && expiresAt > now) {
        return {
          claimed: false,
          retryAfterMs: Math.max(expiresAt - now, 1),
        };
      }

      locks.set(input.lockKey, now + input.ttlMs);
      return { claimed: true, retryAfterMs: input.ttlMs };
    },

    async release(lockKey) {
      locks.delete(lockKey);
    },
  };
}

function parseConsumePayload(data: unknown): CostControlConsumeResult {
  if (!data || typeof data !== "object") {
    throw new Error("invalid cost-control payload");
  }

  const row = data as {
    allowed?: unknown;
    remaining?: unknown;
    retryAfterSeconds?: unknown;
  };

  if (row.allowed === true) {
    return {
      allowed: true,
      remaining:
        typeof row.remaining === "number" && Number.isFinite(row.remaining)
          ? Math.max(0, row.remaining)
          : 0,
    };
  }

  const retryAfterSeconds =
    typeof row.retryAfterSeconds === "number" &&
    Number.isFinite(row.retryAfterSeconds)
      ? row.retryAfterSeconds
      : 1;

  return {
    allowed: false,
    retryAfterMs: Math.max(1, Math.floor(retryAfterSeconds * 1000)),
  };
}

function parseLockPayload(data: unknown): CostControlLockResult {
  if (!data || typeof data !== "object") {
    throw new Error("invalid cost-control lock payload");
  }

  const row = data as { claimed?: unknown; retryAfterSeconds?: unknown };
  const retryAfterSeconds =
    typeof row.retryAfterSeconds === "number" &&
    Number.isFinite(row.retryAfterSeconds)
      ? row.retryAfterSeconds
      : 1;

  return {
    claimed: row.claimed === true,
    retryAfterMs: Math.max(1, Math.floor(retryAfterSeconds * 1000)),
  };
}

const supabaseCostControlStore: CostControlStore = {
  async consume(input) {
    if (!ENDPOINT_CLASS_RE.test(input.endpointClass) || !HEX_64_RE.test(input.bucketKey)) {
      throw new Error("invalid cost-control key");
    }

    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("consume_provider_cost_window", {
      p_endpoint_class: input.endpointClass,
      p_bucket_key: input.bucketKey,
      p_limit: input.limit,
      p_window_seconds: Math.max(1, Math.ceil(input.windowMs / 1000)),
    });

    if (error) {
      throw new Error(error.message);
    }

    return parseConsumePayload(data);
  },

  async tryClaim(input) {
    if (!HEX_64_RE.test(input.lockKey)) {
      throw new Error("invalid cost-control lock key");
    }

    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("claim_provider_cost_lock", {
      p_lock_key: input.lockKey,
      p_ttl_seconds: Math.max(1, Math.ceil(input.ttlMs / 1000)),
    });

    if (error) {
      throw new Error(error.message);
    }

    return parseLockPayload(data);
  },

  async release(lockKey) {
    if (!HEX_64_RE.test(lockKey)) return;

    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const { error } = await admin.rpc("release_provider_cost_lock", {
      p_lock_key: lockKey,
    });

    if (error) {
      console.error("[cost-control] release failed");
    }
  },
};

function logCostControlFailure(stage: string) {
  console.error("[cost-control]", stage, "failed");
}

export async function consumeCostControlWindow(input: {
  request: Request;
  userId?: string | null;
  endpointClass: CostControlEndpointClass;
  limit: number;
  windowMs?: number;
  policy: CostControlPolicy;
}): Promise<CostControlConsumeResult> {
  const bucketKey = hashCostControlBucketKey({
    userId: input.userId,
    ip: getClientIp(input.request),
  });

  try {
    if (process.env.NODE_ENV === "production" && !getHmacSecret()) {
      throw new Error("cost-control hmac secret missing");
    }

    return await getCostControlStore().consume({
      endpointClass: input.endpointClass,
      bucketKey,
      limit: input.limit,
      windowMs: input.windowMs ?? RATE_LIMIT_WINDOW_MS,
    });
  } catch {
    logCostControlFailure("consume");

    if (input.policy === "fail-open") {
      return { allowed: true, remaining: 0 };
    }

    return {
      allowed: false,
      retryAfterMs: 60_000,
      storageFailure: true,
    };
  }
}

export async function claimPremiumGenerationLock(
  assetId: string,
): Promise<CostControlLockResult> {
  const lockKey = hashCostControlLockKey("premium", assetId);

  try {
    if (process.env.NODE_ENV === "production" && !getHmacSecret()) {
      throw new Error("cost-control hmac secret missing");
    }

    return await getCostControlStore().tryClaim({
      lockKey,
      ttlMs: PREMIUM_GENERATION_LOCK_TTL_MS,
    });
  } catch {
    logCostControlFailure("claim");
    return {
      claimed: false,
      retryAfterMs: 60_000,
      storageFailure: true,
    };
  }
}

export async function releasePremiumGenerationLock(assetId: string): Promise<void> {
  const lockKey = hashCostControlLockKey("premium", assetId);

  try {
    await getCostControlStore().release(lockKey);
  } catch {
    logCostControlFailure("release");
  }
}

export async function getOptionalUserId(): Promise<string | null> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

function retryAfterSeconds(retryAfterMs: number): string {
  return String(Math.max(1, Math.ceil(retryAfterMs / 1000)));
}

function jsonStatus(
  body: Record<string, unknown>,
  status: number,
  retryAfterMs?: number,
): Response {
  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "Content-Type": "application/json",
  });

  if (retryAfterMs != null) {
    headers.set("Retry-After", retryAfterSeconds(retryAfterMs));
  }

  return new Response(JSON.stringify(body), { status, headers });
}

export function rateLimitedGenerationResponse(retryAfterMs: number): Response {
  return jsonStatus(
    {
      error: RATE_LIMITED_GENERATION_MESSAGE,
      code: RATE_LIMITED_CODE,
    },
    429,
    retryAfterMs,
  );
}

export function rateLimitedConversationResponse(
  retryAfterMs: number,
  anonymous: boolean,
): Response {
  return jsonStatus(
    {
      error: anonymous
        ? RATE_LIMITED_ANON_DIRECTOR_MESSAGE
        : RATE_LIMITED_CONVERSATION_MESSAGE,
      code: RATE_LIMITED_CODE,
    },
    429,
    retryAfterMs,
  );
}

export function rateLimitedDraftResponse(retryAfterMs: number): Response {
  return jsonStatus(
    {
      error: RATE_LIMITED_DRAFT_MESSAGE,
      code: RATE_LIMITED_CODE,
    },
    429,
    retryAfterMs,
  );
}

export function costControlUnavailableResponse(): Response {
  return jsonStatus(
    {
      error: COST_CONTROL_UNAVAILABLE_MESSAGE,
      code: COST_CONTROL_UNAVAILABLE_CODE,
    },
    503,
    60_000,
  );
}

export function generationInProgressResponse(retryAfterMs: number): Response {
  return jsonStatus(
    {
      error: GENERATION_IN_PROGRESS_MESSAGE,
      code: GENERATION_IN_PROGRESS_CODE,
    },
    409,
    retryAfterMs,
  );
}

export async function enforcePaidProviderCostControl(input: {
  request: Request;
  userId?: string | null;
  endpointClass: CostControlEndpointClass;
  limit: number;
}): Promise<Response | null> {
  const result = await consumeCostControlWindow({
    ...input,
    policy: "fail-closed",
  });

  if (result.allowed) return null;
  if (result.storageFailure) return costControlUnavailableResponse();
  return rateLimitedGenerationResponse(result.retryAfterMs);
}

export async function enforceSoftCostControl(input: {
  request: Request;
  userId?: string | null;
  endpointClass: CostControlEndpointClass;
  limit: number;
  kind: "director-anon" | "director-auth" | "draft";
}): Promise<Response | null> {
  const result = await consumeCostControlWindow({
    ...input,
    policy: "fail-open",
  });

  if (result.allowed) return null;

  if (input.kind === "draft") {
    return rateLimitedDraftResponse(result.retryAfterMs);
  }

  return rateLimitedConversationResponse(
    result.retryAfterMs,
    input.kind === "director-anon",
  );
}
