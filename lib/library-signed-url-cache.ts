import { createSignedLibraryUrl } from "@/lib/library-storage";

/** Slightly under Supabase TTL (3600s) so cached URLs stay playable. */
const SIGNED_URL_CACHE_TTL_MS = 55 * 60 * 1000;

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
      const preserved = options?.preserveUrl ?? cached?.url ?? null;
      return {
        url: preserved,
        error: !preserved,
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
    const preserved = options?.preserveUrl ?? cached?.url ?? null;
    return {
      url: preserved,
      error: !preserved,
      fromCache: false,
      deduplicated: false,
    };
  } finally {
    inflight.delete(path);
  }
}
