export const FINAL_ASSET_UPDATE_ATTEMPTS = 3;
export const FINAL_ASSET_UPDATE_TIMEOUT_MS = 12_000;
export const MAX_PERSISTENCE_DIAGNOSTIC_TEXT_LENGTH = 500;

export function truncatePersistenceDiagnosticText(value: unknown): unknown {
  if (typeof value !== "string") return value;
  return value.length <= MAX_PERSISTENCE_DIAGNOSTIC_TEXT_LENGTH
    ? value
    : `${value.slice(0, MAX_PERSISTENCE_DIAGNOSTIC_TEXT_LENGTH)}…`;
}

export class FinalAssetUpdateTimeoutError extends Error {
  readonly code = "PERSISTENCE_TIMEOUT";
  readonly status = 408;
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`Final asset update timed out after ${timeoutMs}ms.`);
    this.name = "FinalAssetUpdateTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

export function omitAlreadyPersistedImageUrl<T extends Record<string, unknown>>(
  updates: T,
): Omit<T, "image_url"> {
  const {
    image_url: _imageUrl,
    ...finalUpdates
  } = updates;
  return finalUpdates;
}

export function approximateSerializedBytes(value: unknown): number | null {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).byteLength;
  } catch {
    return null;
  }
}

async function settlePersistenceAttempt<T>(pending: Promise<T>): Promise<void> {
  await pending.then(
    () => undefined,
    () => undefined,
  );
}

export async function withFinalAssetUpdateTimeout<T>(
  update: (signal: AbortSignal) => Promise<T>,
  timeoutMs = FINAL_ASSET_UPDATE_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined;
  const pending = update(controller.signal);
  try {
    timeoutId = globalThis.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    return await pending;
  } catch (error) {
    if (timedOut) {
      await settlePersistenceAttempt(pending);
      throw new FinalAssetUpdateTimeoutError(timeoutMs);
    }
    throw error;
  } finally {
    if (timeoutId !== undefined) globalThis.clearTimeout(timeoutId);
  }
}

export function isTransientPersistenceError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; status?: unknown; message?: unknown };
  const code = typeof candidate.code === "string" ? candidate.code : "";
  const status = typeof candidate.status === "number" ? candidate.status : 0;
  const message = typeof candidate.message === "string" ? candidate.message : "";
  return (
    code === "PERSISTENCE_TIMEOUT" || status === 429 || status >= 500 || /^08/.test(code) ||
    ["40001", "40P01", "53300", "57P01", "PGRST000", "PGRST001", "PGRST002"].includes(code) ||
    /fetch failed|network|timeout|temporar|connection|schema cache/i.test(message)
  );
}

export async function retryFinalAssetUpdate<T>(input: {
  update: (signal: AbortSignal, attempt: number) => Promise<T>;
  attempts?: number;
  timeoutMs?: number;
  wait?: (attempt: number) => Promise<void>;
  onRetry?: (error: unknown, attempt: number) => void;
  onTimeout?: (error: FinalAssetUpdateTimeoutError, attempt: number) => void;
}): Promise<T> {
  const attempts = Math.max(1, input.attempts ?? FINAL_ASSET_UPDATE_ATTEMPTS);
  let inFlight: Promise<T> | null = null;
  let patchesInFlight = 0;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (inFlight) {
      await settlePersistenceAttempt(inFlight);
      inFlight = null;
    }

    try {
      const result = await withFinalAssetUpdateTimeout(
        (signal) => {
          if (patchesInFlight > 0) {
            throw new Error("A previous final asset PATCH is still in flight.");
          }
          patchesInFlight += 1;
          const pending = input.update(signal, attempt).finally(() => {
            patchesInFlight = Math.max(0, patchesInFlight - 1);
          });
          inFlight = pending;
          return pending;
        },
        input.timeoutMs,
      );
      inFlight = null;
      return result;
    } catch (error) {
      if (inFlight) {
        await settlePersistenceAttempt(inFlight);
        inFlight = null;
      }
      if (error instanceof FinalAssetUpdateTimeoutError) input.onTimeout?.(error, attempt);
      if (attempt >= attempts || !isTransientPersistenceError(error)) throw error;
      input.onRetry?.(error, attempt);
      await (input.wait?.(attempt) ?? new Promise((resolve) =>
        globalThis.setTimeout(resolve, 250 * attempt),
      ));
    }
  }
  throw new Error("Final asset update retry exhausted.");
}
