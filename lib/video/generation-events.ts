/**
 * Internal generation-event ledger helpers.
 *
 * Observe-only. Must not consume/refund entitlements, select a provider,
 * retry media generation, or change Veo/FFmpeg output.
 * Insert failure must never fail a successful customer generation.
 */

import "server-only";

export const GENERATION_EVENT_RECIPE_ID = "veo_native" as const;
export const GENERATION_EVENT_VENDOR = "vertex" as const;
export const GENERATION_EVENT_STEP = "visual" as const;

/**
 * Preview requested duration when generateCommercialVideo passes
 * `undefined` through to Vertex. Mirrors vertex-provider's
 * VEO_VERTEX_DURATION_SECONDS / default 4 without importing that module.
 */
const VERTEX_PREVIEW_DEFAULT_DURATION_SECONDS = 4;

export type GenerationEventStatus = "success" | "failure";

export type GenerationEventInput = {
  assetId?: number | null;
  runId?: string | null;
  recipeId: string;
  tier?: string | null;
  step: string;
  vendor: string;
  model: string;
  providerRequestId?: string | null;
  durationSeconds?: number | null;
  estimatedUsdMicros?: number | null;
  status: GenerationEventStatus;
  metadata?: Record<string, unknown>;
};

export type GenerationEventRow = {
  asset_id: number | null;
  run_id: string | null;
  recipe_id: string;
  tier: string | null;
  step: string;
  vendor: string;
  model: string;
  provider_request_id: string | null;
  duration_seconds: number | null;
  estimated_usd_micros: number | null;
  status: GenerationEventStatus;
  metadata: Record<string, unknown>;
};

export type GenerationEventsStore = {
  from(table: string): {
    insert(
      row: GenerationEventRow,
    ): PromiseLike<{ error: { message: string } | null }>;
  };
};

export type ObserveVeoVisualGenerationContext = {
  workflow: string;
  tier: string;
  model: string;
  durationSeconds: number | null;
};

function finiteOrNull(value: number): number | null {
  return Number.isFinite(value) ? value : null;
}

export function resolveObservedVeoDurationSeconds(input: {
  requestedDurationSeconds: number | undefined;
}): number | null {
  if (input.requestedDurationSeconds != null) {
    return finiteOrNull(input.requestedDurationSeconds);
  }

  return finiteOrNull(
    Number(
      process.env.VEO_VERTEX_DURATION_SECONDS ??
        VERTEX_PREVIEW_DEFAULT_DURATION_SECONDS,
    ),
  );
}

/**
 * Provider USD cost is not derived here.
 * Customer MXN catalog prices and research notes are not an authoritative
 * Vertex cost config, so this stays null rather than guessing.
 */
export function estimateGenerationUsdMicros(_input?: {
  vendor?: string;
  model?: string;
  durationSeconds?: number | null;
}): number | null {
  return null;
}

export function toGenerationEventRow(
  input: GenerationEventInput,
): GenerationEventRow {
  return {
    asset_id: input.assetId ?? null,
    run_id: input.runId ?? null,
    recipe_id: input.recipeId,
    tier: input.tier ?? null,
    step: input.step,
    vendor: input.vendor,
    model: input.model,
    provider_request_id: input.providerRequestId ?? null,
    duration_seconds:
      input.durationSeconds == null ? null : finiteOrNull(input.durationSeconds),
    estimated_usd_micros: input.estimatedUsdMicros ?? null,
    status: input.status,
    metadata: input.metadata ?? {},
  };
}

function errorMessage(error: unknown): string {
  const message =
    error instanceof Error ? error.message : String(error);
  return message.slice(0, 500);
}

export async function recordGenerationEvent(
  input: GenerationEventInput,
  store?: GenerationEventsStore,
): Promise<void> {
  try {
    const client = store ?? (await loadAdminStore());
    const { error } = await client
      .from("generation_events")
      .insert(toGenerationEventRow(input));

    if (error) {
      console.error("generation_events insert failed:", error.message);
    }
  } catch (error) {
    console.error("generation_events logging failed:", error);
  }
}

async function loadAdminStore(): Promise<GenerationEventsStore> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  return createAdminClient();
}

function visualEventInput(
  context: ObserveVeoVisualGenerationContext,
  status: GenerationEventStatus,
  elapsedMs: number,
  error?: unknown,
): GenerationEventInput {
  const metadata: Record<string, unknown> = {
    workflow: context.workflow,
    elapsed_ms: elapsedMs,
  };

  if (status === "failure" && error !== undefined) {
    metadata.error = errorMessage(error);
  }

  return {
    recipeId: GENERATION_EVENT_RECIPE_ID,
    tier: context.tier,
    step: GENERATION_EVENT_STEP,
    vendor: GENERATION_EVENT_VENDOR,
    model: context.model,
    durationSeconds: context.durationSeconds,
    estimatedUsdMicros: estimateGenerationUsdMicros({
      vendor: GENERATION_EVENT_VENDOR,
      model: context.model,
      durationSeconds: context.durationSeconds,
    }),
    status,
    metadata,
  };
}

export async function observeVeoVisualGeneration<T>(
  context: ObserveVeoVisualGenerationContext,
  run: () => Promise<T>,
  store?: GenerationEventsStore,
): Promise<T> {
  const startedAt = Date.now();

  try {
    const result = await run();
    await recordGenerationEvent(
      visualEventInput(context, "success", Date.now() - startedAt),
      store,
    );
    return result;
  } catch (error) {
    await recordGenerationEvent(
      visualEventInput(context, "failure", Date.now() - startedAt, error),
      store,
    );
    throw error;
  }
}
