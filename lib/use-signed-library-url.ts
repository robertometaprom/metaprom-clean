"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getSignedLibraryUrlCached } from "@/lib/library-signed-url-cache";

export type SignedLibraryUrlState = {
  url: string | null;
  /** True while signing and no playable URL is available yet. */
  loading: boolean;
  error: boolean;
  missing: boolean;
  retry: () => Promise<void>;
};

export function useSignedLibraryUrl(
  path: string | null | undefined,
  initialUrl?: string | null,
): SignedLibraryUrlState {
  const [url, setUrl] = useState<string | null>(() => initialUrl ?? null);
  const [signing, setSigning] = useState(() => Boolean(path && !initialUrl));
  const [error, setError] = useState(false);
  const urlRef = useRef(url);
  urlRef.current = url;

  const applyResult = useCallback(
    (nextUrl: string | null, failed: boolean) => {
      if (nextUrl) {
        setUrl((previous) => nextUrl ?? previous);
        setError(false);
        return;
      }

      if (failed && !urlRef.current) {
        setError(true);
      }
    },
    [],
  );

  const hydrate = useCallback(
    async (force = false) => {
      if (!path) {
        setSigning(false);
        setError(false);
        return;
      }

      setSigning(true);
      if (force) {
        setError(false);
      }

      const result = await getSignedLibraryUrlCached(path, {
        preserveUrl: urlRef.current,
        forceRefresh: force,
      });

      applyResult(result.url, result.error);
      setSigning(false);
    },
    [applyResult, path],
  );

  useEffect(() => {
    if (!path) {
      setSigning(false);
      setError(false);
      return;
    }

    if (initialUrl) {
      setUrl((previous) => initialUrl ?? previous);
      setSigning(false);
      setError(false);
      return;
    }

    let cancelled = false;
    setSigning(true);
    setError(false);

    void getSignedLibraryUrlCached(path, { preserveUrl: urlRef.current }).then(
      (result) => {
        if (cancelled) return;
        applyResult(result.url, result.error);
        setSigning(false);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [applyResult, initialUrl, path]);

  const retry = useCallback(async () => {
    await hydrate(true);
  }, [hydrate]);

  return {
    url,
    loading: signing && !url,
    error,
    missing: !path,
    retry,
  };
}
