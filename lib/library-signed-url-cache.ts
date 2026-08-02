import { createSignedLibraryUrl } from "@/lib/library-storage";

/** Slightly under Supabase TTL (3600s) so cached URLs stay playable. */
const SIGNED_URL_CACHE_TTL_MS = 55 * 60 * 1000;

const SIGNED_LIBRARY_URL_PATTERN =
  /\/storage\/v1\/object\/sign\/library\//;

type CacheEntry = {
  url: string;
  expiresAt: number;
};

export type SignedLibraryUrlResult = {
  url: string | null;
  error: boolean;
  fromCache: boolean;
  deduplicated: boolean;
};

export type SignedLibraryUrlMetrics = {
  requests: number;
  cacheHits: number;
  deduplicated: number;
};

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string>>();

export const signedLibraryUrlMetrics: SignedLibraryUrlMetrics = {
  requests: 0,
  cacheHits: 0,
  deduplicated: 0,
};

export function resetSignedLibraryUrlMetrics(): void {
  signedLibraryUrlMetrics.requests = 0;
  signedLibraryUrlMetrics.cacheHits = 0;
  signedLibraryUrlMetrics.deduplicated = 0;
}

export function resetSignedLibraryUrlCache(): void {
  cache.clear();
  inflight.clear();
}

function parseJwtExpirationMs(token: string): number | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const decoded = JSON.parse(atob(padded)) as { exp?: number };
    return typeof decoded.exp === "number" ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}

/** Validates preserved/cached signed URLs before reuse on signing failure. */
export function isValidSignedLibraryFallbackUrl(
  url: string | null | undefined,
): boolean {
  if (!url) return false;
  if (!SIGNED_LIBRARY_URL_PATTERN.test(url)) return false;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  const token = parsed.searchParams.get("token")?.trim();
  if (!token) return false;

  const expiresAtMs = parseJwtExpirationMs(token);
  if (expiresAtMs !== null && expiresAtMs <= Date.now()) {
    return false;
  }

  return true;
}

export function pickValidSignedLibraryFallbackUrl(
  ...candidates: Array<string | null | undefined>
): string | null {
  for (const candidate of candidates) {
    if (isValidSignedLibraryFallbackUrl(candidate)) {
      return candidate!;
    }
  }
  return null;
}

export function peekSignedLibraryUrlCache(path: string): string | null {
  const entry = cache.get(path);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) return entry.url;
  return entry.url;
}

export async function getSignedLibraryUrlCached(
  path: string,
  options?: {
    preserveUrl?: string | null;
    forceRefresh?: boolean;
  },
): Promise<SignedLibraryUrlResult> {
  const now = Date.now();
  const cached = cache.get(path);

  if (cached && cached.expiresAt > now && !options?.forceRefresh) {
    signedLibraryUrlMetrics.cacheHits += 1;
    return {
      url: cached.url,
      error: false,
      fromCache: true,
      deduplicated: false,
    };
  }

  const existing = inflight.get(path);
  if (existing) {
    signedLibraryUrlMetrics.deduplicated += 1;
    try {
      const url = await existing;
      return { url, error: false, fromCache: false, deduplicated: true };
    } catch {
      const fallbackUrl = pickValidSignedLibraryFallbackUrl(
        options?.preserveUrl,
        cached?.url,
      );
      return {
        url: fallbackUrl,
        error: !fallbackUrl,
        fromCache: false,
        deduplicated: true,
      };
    }
  }

  signedLibraryUrlMetrics.requests += 1;

  const promise = createSignedLibraryUrl(path);
  inflight.set(path, promise);

  try {
    const url = await promise;
    cache.set(path, { url, expiresAt: now + SIGNED_URL_CACHE_TTL_MS });
    return { url, error: false, fromCache: false, deduplicated: false };
  } catch (error) {
    console.error("getSignedLibraryUrlCached failed", { path, error });
    const fallbackUrl = pickValidSignedLibraryFallbackUrl(
      options?.preserveUrl,
      cached?.url,
    );
    return {
      url: fallbackUrl,
      error: !fallbackUrl,
      fromCache: false,
      deduplicated: false,
    };
  } finally {
    inflight.delete(path);
  }
}
