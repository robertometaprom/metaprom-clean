/**
 * Batch Multi-Photo V1 — Advertising Image orchestrator.
 *
 * N source photos → N independent createAdvertisingImage + persistCreationToLibrary calls.
 * Does not rewrite the single-image pipeline or provider payloads.
 */

import {
  ADVERTISING_IMAGE_PACKAGE_REQUIRED_CODE,
  ADVERTISING_IMAGE_PACKAGE_REQUIRED_MESSAGE,
  ADVERTISING_IMAGE_PLANES_HREF,
} from "@/lib/entitlements/advertising-image-gate";
import type { StudioProjectMetadata } from "@/lib/biblioteca";
import type { Mode } from "@/lib/prompts";
import type { ImageIntent } from "@/lib/studio/image-intent";
import {
  createAdvertisingImage,
  persistCreationToLibrary,
  type PersistCreationResult,
} from "@/lib/studio-creation";

export const BATCH_ADVERTISING_CONCURRENCY = 2;

export type BatchItemStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export type BatchAdvertisingItem = {
  id: string;
  file: File;
  originalFilename: string;
  status: BatchItemStatus;
  errorMessage?: string | null;
  assetId?: string | null;
  premiumImage?: string | null;
  imagePrompt?: string | null;
};

export type BatchAdvertisingPhase =
  | "idle"
  | "preflight"
  | "running"
  | "complete"
  | "blocked";

export type BatchAdvertisingProgress = {
  items: BatchAdvertisingItem[];
  projectId: string | null;
  completedCount: number;
  failedCount: number;
  processingCount: number;
  queuedCount: number;
  totalCount: number;
  phase: BatchAdvertisingPhase;
  message: string;
  creditsShortfall?: number;
  remainingCredits?: number;
  planesHref?: typeof ADVERTISING_IMAGE_PLANES_HREF;
  code?: typeof ADVERTISING_IMAGE_PACKAGE_REQUIRED_CODE;
};

export class BatchInsufficientCreditsError extends Error {
  readonly code = ADVERTISING_IMAGE_PACKAGE_REQUIRED_CODE;
  readonly planesHref = ADVERTISING_IMAGE_PLANES_HREF;
  readonly needed: number;
  readonly remaining: number;
  readonly shortfall: number;

  constructor(needed: number, remaining: number) {
    const shortfall = Math.max(0, needed - remaining);
    super(
      shortfall > 0
        ? `Necesitas ${shortfall} crédito${shortfall === 1 ? "" : "s"} adicional${shortfall === 1 ? "" : "es"} para procesar este lote.`
        : ADVERTISING_IMAGE_PACKAGE_REQUIRED_MESSAGE,
    );
    this.name = "BatchInsufficientCreditsError";
    this.needed = needed;
    this.remaining = remaining;
    this.shortfall = shortfall;
  }
}

export type BatchAdvertisingBalances = {
  advertisingAssetsRemaining: number;
};

export type BatchAdvertisingOrchestratorDeps = {
  createAdvertisingImage?: typeof createAdvertisingImage;
  persistCreationToLibrary?: typeof persistCreationToLibrary;
  fetchBalances?: () => Promise<BatchAdvertisingBalances>;
  concurrency?: number;
};

export type RunBatchAdvertisingInput = {
  files: File[];
  customerIntent: string;
  productMode: Mode;
  /**
   * One common job intent for the whole batch.
   * Each photo is still an independent generation with the same intent.
   */
  imageIntent?: ImageIntent;
  projectMetadata: StudioProjectMetadata;
  /** Shared project from a prior partial batch run. */
  existingProjectId?: string | null;
  /** Resume/retry from prior item state (failed → queued). */
  existingItems?: BatchAdvertisingItem[];
  /** When set, only these item ids are (re)processed. */
  onlyItemIds?: string[];
  onProgress?: (progress: BatchAdvertisingProgress) => void;
};

function sourceFileIdentity(file: File, index: number): string {
  return `${file.name}::${file.size}::${file.lastModified}::${index}`;
}

function summarize(items: BatchAdvertisingItem[]): {
  completedCount: number;
  failedCount: number;
  processingCount: number;
  queuedCount: number;
} {
  let completedCount = 0;
  let failedCount = 0;
  let processingCount = 0;
  let queuedCount = 0;
  for (const item of items) {
    if (item.status === "completed") completedCount += 1;
    else if (item.status === "failed") failedCount += 1;
    else if (item.status === "processing") processingCount += 1;
    else queuedCount += 1;
  }
  return { completedCount, failedCount, processingCount, queuedCount };
}

function buildProgress(
  items: BatchAdvertisingItem[],
  projectId: string | null,
  phase: BatchAdvertisingPhase,
  message: string,
  extra?: Partial<BatchAdvertisingProgress>,
): BatchAdvertisingProgress {
  const counts = summarize(items);
  return {
    items: items.map((item) => ({ ...item })),
    projectId,
    totalCount: items.length,
    phase,
    message,
    ...counts,
    ...extra,
  };
}

async function defaultFetchBalances(): Promise<BatchAdvertisingBalances> {
  const response = await fetch("/api/entitlements/balances");
  if (!response.ok) {
    throw new Error("No pudimos consultar tus créditos disponibles.");
  }
  const payload = (await response.json().catch(() => null)) as {
    advertisingAssetsRemaining?: number;
  } | null;
  return {
    advertisingAssetsRemaining:
      typeof payload?.advertisingAssetsRemaining === "number"
        ? payload.advertisingAssetsRemaining
        : 0,
  };
}

/**
 * Credit preflight for a batch (or retry subset).
 * Throws BatchInsufficientCreditsError when remaining < needed.
 */
export async function preflightBatchAdvertisingCredits(
  needed: number,
  fetchBalances: () => Promise<BatchAdvertisingBalances> = defaultFetchBalances,
): Promise<number> {
  if (needed <= 0) return 0;
  const balances = await fetchBalances();
  const remaining = balances.advertisingAssetsRemaining;
  if (remaining < needed) {
    throw new BatchInsufficientCreditsError(needed, remaining);
  }
  return remaining;
}

function initItems(input: RunBatchAdvertisingInput): BatchAdvertisingItem[] {
  if (input.existingItems?.length) {
    const only = input.onlyItemIds ? new Set(input.onlyItemIds) : null;
    return input.existingItems.map((item) => {
      if (item.status === "completed") {
        return { ...item };
      }
      if (only && !only.has(item.id)) {
        return { ...item };
      }
      // Retry / fresh run for non-completed items in scope.
      if (!only || only.has(item.id)) {
        return {
          ...item,
          status: "queued" as const,
          errorMessage: null,
          // Retries must not reuse a prior failed/partial asset id.
          assetId: null,
          premiumImage: null,
          imagePrompt: null,
        };
      }
      return { ...item };
    });
  }

  return input.files.map((file, index) => ({
    id: sourceFileIdentity(file, index),
    file,
    originalFilename: file.name,
    status: "queued" as const,
    errorMessage: null,
    assetId: null,
    premiumImage: null,
    imagePrompt: null,
  }));
}

/**
 * Run (or retry) a Batch Advertising Image queue.
 * Concurrency defaults to 2. Never mixes source photos into one provider call.
 */
export async function runBatchAdvertisingImages(
  input: RunBatchAdvertisingInput,
  deps: BatchAdvertisingOrchestratorDeps = {},
): Promise<BatchAdvertisingProgress> {
  const createImage = deps.createAdvertisingImage ?? createAdvertisingImage;
  const persist = deps.persistCreationToLibrary ?? persistCreationToLibrary;
  const fetchBalances = deps.fetchBalances ?? defaultFetchBalances;
  const concurrency = Math.max(
    1,
    deps.concurrency ?? BATCH_ADVERTISING_CONCURRENCY,
  );

  const items = initItems(input);
  if (items.length === 0) {
    return buildProgress(items, input.existingProjectId ?? null, "complete", "0 de 0 imágenes listas");
  }

  const emit = (
    phase: BatchAdvertisingPhase,
    message: string,
    projectId: string | null,
    extra?: Partial<BatchAdvertisingProgress>,
  ) => {
    const progress = buildProgress(items, projectId, phase, message, extra);
    input.onProgress?.(progress);
    return progress;
  };

  const workIndexes = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => {
      if (item.status === "completed") return false;
      if (input.onlyItemIds) return input.onlyItemIds.includes(item.id);
      return item.status === "queued";
    })
    .map(({ index }) => index);

  const needed = workIndexes.length;

  emit(
    "preflight",
    "Verificando créditos…",
    input.existingProjectId ?? null,
  );

  let remainingCredits: number;
  try {
    remainingCredits = await preflightBatchAdvertisingCredits(
      needed,
      fetchBalances,
    );
  } catch (error) {
    if (error instanceof BatchInsufficientCreditsError) {
      return emit("blocked", error.message, input.existingProjectId ?? null, {
        creditsShortfall: error.shortfall,
        remainingCredits: error.remaining,
        planesHref: error.planesHref,
        code: error.code,
      });
    }
    throw error;
  }

  let sharedProjectId: string | null = input.existingProjectId ?? null;
  /**
   * Ensures the first successful persistence establishes the shared project
   * before concurrent workers attach. Concurrency=2 must not create 2 projects.
   */
  let projectGate: Promise<void> = Promise.resolve();

  const persistWithSharedProject = async (args: {
    originalFile: File;
    enhancedDataUrl: string;
    imagePrompt: string;
  }): Promise<PersistCreationResult> => {
    if (sharedProjectId) {
      return persist({
        originalFile: args.originalFile,
        enhancedDataUrl: args.enhancedDataUrl,
        imagePrompt: args.imagePrompt,
        videoPrompt: "",
        customerIntent: input.customerIntent,
        mode: input.productMode,
        projectMetadata: input.projectMetadata,
        existingProjectId: sharedProjectId,
        existingAssetId: null,
        billAdvertisingAsset: true,
      });
    }

    const previous = projectGate;
    let release!: () => void;
    projectGate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;

    try {
      if (sharedProjectId) {
        return await persist({
          originalFile: args.originalFile,
          enhancedDataUrl: args.enhancedDataUrl,
          imagePrompt: args.imagePrompt,
          videoPrompt: "",
          customerIntent: input.customerIntent,
          mode: input.productMode,
          projectMetadata: input.projectMetadata,
          existingProjectId: sharedProjectId,
          existingAssetId: null,
          billAdvertisingAsset: true,
        });
      }

      const result = await persist({
        originalFile: args.originalFile,
        enhancedDataUrl: args.enhancedDataUrl,
        imagePrompt: args.imagePrompt,
        videoPrompt: "",
        customerIntent: input.customerIntent,
        mode: input.productMode,
        projectMetadata: input.projectMetadata,
        existingProjectId: null,
        existingAssetId: null,
        billAdvertisingAsset: true,
      });

      if (result.projectId) {
        sharedProjectId = result.projectId;
      }
      return result;
    } finally {
      release();
    }
  };

  emit(
    "running",
    `0 de ${items.length} completadas`,
    sharedProjectId,
    { remainingCredits },
  );

  let cursor = 0;

  const runWorker = async () => {
    while (cursor < workIndexes.length) {
      const itemIndex = workIndexes[cursor];
      cursor += 1;
      const item = items[itemIndex];
      if (!item || item.status === "completed") continue;

      item.status = "processing";
      item.errorMessage = null;
      const { completedCount } = summarize(items);
      emit(
        "running",
        `${completedCount} de ${items.length} completadas`,
        sharedProjectId,
      );

      try {
        const generated = await createImage({
          file: item.file,
          customerIntent: input.customerIntent,
          productMode: input.productMode,
          imageIntent: input.imageIntent,
        });

        const persistResult = await persistWithSharedProject({
          originalFile: item.file,
          enhancedDataUrl: generated.premiumImage,
          imagePrompt: generated.imagePrompt,
        });

        if (persistResult.status === "requires-package") {
          item.status = "failed";
          item.errorMessage =
            persistResult.message ?? ADVERTISING_IMAGE_PACKAGE_REQUIRED_MESSAGE;
        } else if (persistResult.status !== "saved" || !persistResult.assetId) {
          item.status = "failed";
          item.errorMessage =
            persistResult.message ??
            "No pudimos guardar esta imagen en Biblioteca.";
        } else {
          item.status = "completed";
          item.assetId = persistResult.assetId;
          item.premiumImage = generated.premiumImage;
          item.imagePrompt = generated.imagePrompt;
          if (persistResult.projectId) {
            sharedProjectId = persistResult.projectId;
          }
        }
      } catch (error) {
        item.status = "failed";
        item.errorMessage =
          error instanceof Error
            ? error.message
            : "No pudimos crear esta imagen.";
      }

      const counts = summarize(items);
      emit(
        "running",
        `${counts.completedCount} de ${items.length} completadas`,
        sharedProjectId,
      );
    }
  };

  const workerCount = Math.min(concurrency, workIndexes.length);
  await Promise.all(
    Array.from({ length: workerCount }, () => runWorker()),
  );

  const finalCounts = summarize(items);
  const message = `${finalCounts.completedCount} de ${items.length} imágenes listas`;
  return emit("complete", message, sharedProjectId);
}
