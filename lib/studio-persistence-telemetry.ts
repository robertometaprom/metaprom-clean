/**
 * Temporary P0 observability for the 96% commercial persistence boundary.
 * Fire-and-forget only — must never alter persistence timing or outcomes.
 */

export type PersistenceTelemetryStage =
  | "teaser_upload_success"
  | "post_upload_fetch_start"
  | "post_upload_fetch_success"
  | "post_upload_fetch_error"
  | "pre_finalization_start"
  | "resolve_share_slug_start"
  | "resolve_share_slug_success"
  | "resolve_share_slug_error"
  | "recipe_build_start"
  | "recipe_build_success"
  | "recipe_build_error"
  | "pre_finalization_complete"
  | "finalization_start"
  | "patch_attempt_start"
  | "patch_dispatched"
  | "patch_result"
  | "retry_decision"
  | "patch_attempt_settled"
  | "final_success"
  | "final_failure";

export type PersistenceTelemetryResult =
  | "success"
  | "error"
  | "timeout"
  | "abort"
  | "retry"
  | "unknown";

export type PersistenceTelemetryEvent = {
  stage: PersistenceTelemetryStage;
  projectId?: string | null;
  assetId?: string | null;
  attempt?: number | null;
  result?: PersistenceTelemetryResult | null;
  errorCode?: string | null;
  errorName?: string | null;
  errorMessage?: string | null;
  payloadBytes?: number | null;
};

function classifyTelemetryError(error: unknown): {
  result: PersistenceTelemetryResult;
  errorCode: string | null;
  errorName: string | null;
  errorMessage: string | null;
} {
  if (!error || typeof error !== "object") {
    return {
      result: "unknown",
      errorCode: null,
      errorName: null,
      errorMessage: truncate(String(error)),
    };
  }

  const candidate = error as {
    name?: unknown;
    code?: unknown;
    status?: unknown;
    message?: unknown;
  };
  const name = typeof candidate.name === "string" ? candidate.name : null;
  const code = typeof candidate.code === "string" ? candidate.code : null;
  const message =
    typeof candidate.message === "string" ? truncate(candidate.message) : null;

  if (code === "PERSISTENCE_TIMEOUT" || name === "FinalAssetUpdateTimeoutError") {
    return { result: "timeout", errorCode: code ?? "PERSISTENCE_TIMEOUT", errorName: name, errorMessage: message };
  }

  if (
    name === "AbortError" ||
    code === "ABORT_ERR" ||
    (typeof message === "string" && /aborted|AbortError/i.test(message))
  ) {
    return { result: "abort", errorCode: code, errorName: name, errorMessage: message };
  }

  return { result: "error", errorCode: code, errorName: name, errorMessage: message };
}

function truncate(value: string, max = 240): string {
  return value.length <= max ? value : `${value.slice(0, max)}…`;
}

/**
 * Non-blocking client → server telemetry hop so events land in Vercel logs.
 * Never awaited by callers. Failures are swallowed.
 */
export function emitPersistenceTelemetry(event: PersistenceTelemetryEvent): void {
  try {
    const body = JSON.stringify({
      ...event,
      ts: new Date().toISOString(),
    });

    void fetch("/api/studio/persistence-telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => undefined);
  } catch {
    // Telemetry must never affect persistence.
  }
}

export function emitPersistenceTelemetryError(
  stage: PersistenceTelemetryStage,
  base: Omit<PersistenceTelemetryEvent, "stage" | "result" | "errorCode" | "errorName" | "errorMessage">,
  error: unknown,
): void {
  const classified = classifyTelemetryError(error);
  emitPersistenceTelemetry({
    ...base,
    stage,
    result: classified.result,
    errorCode: classified.errorCode,
    errorName: classified.errorName,
    errorMessage: classified.errorMessage,
  });
}
