const FINAL_ASSET_UPDATE_ATTEMPTS = 3;

export function isTransientPersistenceError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; status?: unknown; message?: unknown };
  const code = typeof candidate.code === "string" ? candidate.code : "";
  const status = typeof candidate.status === "number" ? candidate.status : 0;
  const message = typeof candidate.message === "string" ? candidate.message : "";
  return (
    status === 429 || status >= 500 || /^08/.test(code) ||
    ["40001", "40P01", "53300", "57P01", "PGRST000", "PGRST001", "PGRST002"].includes(code) ||
    /fetch failed|network|timeout|temporar|connection|schema cache/i.test(message)
  );
}

export async function retryFinalAssetUpdate<T>(input: {
  update: () => Promise<T>;
  attempts?: number;
  wait?: (attempt: number) => Promise<void>;
  onRetry?: (error: unknown, attempt: number) => void;
}): Promise<T> {
  const attempts = Math.max(1, input.attempts ?? FINAL_ASSET_UPDATE_ATTEMPTS);
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await input.update();
    } catch (error) {
      if (attempt >= attempts || !isTransientPersistenceError(error)) throw error;
      input.onRetry?.(error, attempt);
      await (input.wait?.(attempt) ?? new Promise((resolve) =>
        globalThis.setTimeout(resolve, 250 * attempt),
      ));
    }
  }
  throw new Error("Final asset update retry exhausted.");
}
