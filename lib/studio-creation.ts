import {
  BibliotecaAuthError,
  fetchBibliotecaAssetById,
  type StudioProjectMetadata,
} from "@/lib/biblioteca";
import { mapCreationError } from "@/lib/creation-errors";
import {
  ADVERTISING_IMAGE_AUTH_REQUIRED_CODE,
  ADVERTISING_IMAGE_AUTH_REQUIRED_MESSAGE,
  ADVERTISING_IMAGE_PACKAGE_REQUIRED_CODE,
  ADVERTISING_IMAGE_PACKAGE_REQUIRED_MESSAGE,
  ADVERTISING_IMAGE_PLANES_HREF,
  ADVERTISING_IMAGE_PURPOSE_FIELD,
  ADVERTISING_IMAGE_PURPOSE_VALUE,
  shouldBillAdvertisingAsset,
} from "@/lib/entitlements/advertising-image-gate";
import type { PaymentMethod } from "@/lib/payments/types";
import type { Mode } from "@/lib/prompts";
import { toDestinationGenerationPayload } from "@/lib/destination-generation";
import type { StudioDestination } from "@/lib/studio-destination";
import type { CommercialProductionProfile } from "@/lib/commercial-production-profile";
import type { PromotionalOverlays } from "@/lib/commercial-production-profile";
import type { OverlayStyle } from "@/lib/overlay-style-contract";
import type { RequiredNarrativeBeats } from "@/lib/narrative-beats-contract";
import {
  buildAdvertisingImagePrompt,
  resolveImageIntent,
  type ImageIntent,
} from "@/lib/studio/image-intent";
import { persistStudioCreation } from "@/lib/studio-persistence";
import {
  buildStudioImagePrompt,
  buildStudioVideoPrompt,
} from "@/lib/studio-prompts";
import { createClient } from "@/lib/supabase/client";

export type CreationStep = "image" | "video" | "done";

/**
 * Studio Dual Creation routing intent.
 * Deterministic ownership lives in Studio / CreativeDirector orchestration.
 * Director may set/infer this later without rewriting downstream flows.
 */
export type CreationMode = "commercial" | "advertising_image";

export type AutoSaveStatus =
  | "idle"
  | "saving"
  | "saved"
  | "local-only"
  | "requires-package";

export type CreateCommercialInput = {
  file: File;
  customerIntent: string;
  visualGenerationIntent?: string;
  promotionalOverlays?: PromotionalOverlays | null;
  productionProfile?: CommercialProductionProfile | null;
  overlayStyle?: OverlayStyle | null;
  requiredNarrativeBeats?: RequiredNarrativeBeats | null;
  productMode: Mode;
  destination?: StudioDestination | null;
  onStep?: (step: CreationStep, message: string) => void;
};

export type CreateCommercialResult = {
  premiumImage: string;
  videoBlob: Blob;
  videoUrl: string;
  imagePrompt: string;
  videoPrompt: string;
  generationMetadata: {
    imageProvider: string;
    imageModel: string;
    videoProvider: string;
    previewVideoModel: string;
    premiumVideoModel: string;
  };
};

export type CreateAdvertisingImageInput = {
  /** Primary source image. Phase 4D may accept `files` / multi-input without new product types. */
  file: File;
  customerIntent: string;
  productMode: Mode;
  /**
   * Runtime Advertising Image intent. When omitted, resolved from customerIntent.
   * Batch Multi-Photo passes one shared intent for the whole job.
   */
  imageIntent?: ImageIntent;
  onStep?: (step: CreationStep, message: string) => void;
};

export type CreateAdvertisingImageResult = {
  premiumImage: string;
  imagePrompt: string;
  imageIntent: ImageIntent;
};

export class AdvertisingImageAuthRequiredError extends Error {
  readonly code = ADVERTISING_IMAGE_AUTH_REQUIRED_CODE;
  constructor(message: string = ADVERTISING_IMAGE_AUTH_REQUIRED_MESSAGE) {
    super(message);
    this.name = "AdvertisingImageAuthRequiredError";
  }
}

export class AdvertisingImagePackageRequiredError extends Error {
  readonly code = ADVERTISING_IMAGE_PACKAGE_REQUIRED_CODE;
  readonly planesHref = ADVERTISING_IMAGE_PLANES_HREF;
  constructor(message: string = ADVERTISING_IMAGE_PACKAGE_REQUIRED_MESSAGE) {
    super(message);
    this.name = "AdvertisingImagePackageRequiredError";
  }
}

export type PersistCreationInput = {
  originalFile: File;
  enhancedDataUrl: string;
  teaserVideoBlob?: Blob;
  imagePrompt: string;
  videoPrompt: string;
  customerIntent: string;
  visualGenerationIntent?: string;
  promotionalOverlays?: PromotionalOverlays | null;
  productionProfile?: CommercialProductionProfile | null;
  overlayStyle?: OverlayStyle | null;
  requiredNarrativeBeats?: RequiredNarrativeBeats | null;
  mode: Mode;
  projectMetadata: StudioProjectMetadata;
  existingProjectId?: string | null;
  existingAssetId?: string | null;
  localDraftKey?: string;
  /**
   * When true, first finished persist requires & consumes 1 advertising_asset.
   * When false, skip (Commercial production). When omitted, inferred from teaser.
   */
  billAdvertisingAsset?: boolean;
  generationMetadata?: CreateCommercialResult["generationMetadata"];
};

export type PersistCreationResult = {
  projectId: string | null;
  assetId: string | null;
  shareSlug: string | null;
  status: AutoSaveStatus;
  code?: typeof ADVERTISING_IMAGE_PACKAGE_REQUIRED_CODE;
  message?: string;
  planesHref?: typeof ADVERTISING_IMAGE_PLANES_HREF;
};

export type PurchaseHdInput = {
  assetId: string;
  paymentMethod: PaymentMethod;
  onStatus?: (message: string) => void;
};

export type PurchaseHdResult = {
  assetId?: string;
  premiumVideoUrl: string | null;
  message: string;
  redirected?: boolean;
};

type RuntimeTraceBody = Record<string, unknown> & {
  error?: string;
  traceId?: string;
};

function createRuntimeTraceId(): string {
  return `checkout-${Date.now()}-${crypto.randomUUID()}`;
}

function describeUnknownError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}${error.stack ? `\n${error.stack}` : ""}`;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function readId(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

function traceRuntime(traceId: string, stage: string, details?: unknown) {
  console.error(`[metaprom-runtime-trace:${traceId}] ${stage}`, details ?? null);
}

async function readRuntimeResponseBody(
  response: Response,
  traceId: string,
  stage: string,
): Promise<RuntimeTraceBody> {
  const responseText = await response.text();
  let responseBody: RuntimeTraceBody = {};

  try {
    responseBody = responseText
      ? (JSON.parse(responseText) as RuntimeTraceBody)
      : {};
  } catch (parseError) {
    traceRuntime(traceId, `${stage} response JSON parse failed`, {
      error: describeUnknownError(parseError),
      responseText,
    });
    responseBody = { error: responseText };
  }

  traceRuntime(traceId, `${stage} response`, {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    url: response.url,
    headers: Object.fromEntries(response.headers.entries()),
    bodyText: responseText,
    body: responseBody,
  });

  return responseBody;
}

function throwRuntimeResponseError(
  traceId: string,
  stage: string,
  response: Response,
  body: RuntimeTraceBody,
): never {
  if (response.status === 429 && typeof body.error === "string") {
    throw new Error(body.error);
  }

  if (response.status === 409 && typeof body.error === "string") {
    throw new Error(body.error);
  }

  throw new Error(
    `[${traceId}] ${stage} failed (${response.status} ${response.statusText}): ${JSON.stringify(
      body,
    )}`,
  );
}

export function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new File([bytes], filename, { type: mime });
}

function normalizePersistLogDetails(details?: Record<string, unknown>) {
  if (!details) return undefined;

  return Object.fromEntries(
    Object.entries(details).map(([key, value]) => {
      if (value instanceof Error) {
        return [
          key,
          {
            name: value.name,
            message: value.message,
            stack: value.stack,
          },
        ];
      }

      return [key, value];
    }),
  );
}

function logPersistCreationStage(
  stage: string,
  details?: Record<string, unknown>,
) {
  console.info("[persistCreationToLibrary]", {
    stage,
    ...normalizePersistLogDetails(details),
  });
}

export async function parseJsonResponse(
  response: Response,
): Promise<{ image?: string; error?: string; provider?: string; model?: string }> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return { error: `Error del servidor (${response.status}).` };
  }

  try {
    return (await response.json()) as {
      image?: string;
      error?: string;
      provider?: string;
      model?: string;
    };
  } catch {
    return { error: "Respuesta inválida del servidor." };
  }
}

export { mapCreationError } from "@/lib/creation-errors";

export async function createCommercialAssets(
  input: CreateCommercialInput,
): Promise<CreateCommercialResult> {
  const customerIntent = input.customerIntent.trim();
  const destination = input.destination ?? null;
  const imagePrompt = buildStudioImagePrompt(
    customerIntent,
    input.productMode,
    destination,
  );

  input.onStep?.("image", "Preparando tu escena comercial...");

  const formData = new FormData();
  formData.append("image", input.file);
  formData.append("mode", "custom");
  formData.append("aiInstructions", imagePrompt);
  if (destination) {
    formData.append(
      "destination",
      JSON.stringify(toDestinationGenerationPayload(destination).destination),
    );
  }

  const response = await fetch("/api/enhancement", {
    method: "POST",
    body: formData,
  });

  const data = await parseJsonResponse(response);

  if (response.status === 429 && data.error) {
    throw new Error(mapCreationError(data.error) || data.error);
  }

  if (!response.ok || !data.image) {
    throw new Error(
      mapCreationError(data.error) || "No pudimos preparar tu escena comercial.",
    );
  }

  input.onStep?.("video", "Preparando tu comercial...");

  const videoPrompt = buildStudioVideoPrompt(
    customerIntent,
    "teaser",
    destination,
  );
  const videoForm = new FormData();
  videoForm.append("image", dataUrlToFile(data.image, "commercial.jpg"));
  videoForm.append("prompt", videoPrompt);
  videoForm.append("tier", "teaser");
  if (destination) {
    videoForm.append(
      "destination",
      JSON.stringify(toDestinationGenerationPayload(destination).destination),
    );
  }

  const videoResponse = await fetch("/api/video", {
    method: "POST",
    body: videoForm,
  });

  if (!videoResponse.ok) {
    const videoData = await parseJsonResponse(videoResponse);
    throw new Error(
      mapCreationError(videoData.error) || "No pudimos crear tu comercial.",
    );
  }

  const blob = await videoResponse.blob();
  if (blob.size === 0) {
    throw new Error("No pudimos crear tu comercial.");
  }

  input.onStep?.("done", "¡Listo!");

  return {
    premiumImage: data.image,
    videoBlob: blob,
    videoUrl: URL.createObjectURL(blob),
    imagePrompt,
    videoPrompt,
    generationMetadata: {
      imageProvider: data.provider ?? "openai-responses-image-generation",
      imageModel: data.model ?? "configured-at-generation",
      videoProvider:
        videoResponse.headers.get("X-Metaprom-Provider") ?? "vertex-veo",
      previewVideoModel:
        videoResponse.headers.get("X-Metaprom-Model") ?? "configured-at-generation",
      premiumVideoModel:
        videoResponse.headers.get("X-Metaprom-Premium-Model") ??
        "configured-at-generation",
    },
  };
}

/**
 * Standalone Advertising Image generation — Premium Image only.
 * Must never call /api/video or enter Commercial destination/video flows.
 *
 * Routes by ImageIntent BEFORE prompt construction:
 * platform_fidelity / professional_enhancement must never receive the
 * creative advertising wrapper. creative_advertising preserves it.
 */
export async function createAdvertisingImage(
  input: CreateAdvertisingImageInput,
): Promise<CreateAdvertisingImageResult> {
  const customerIntent = input.customerIntent.trim();

  const intentResolution = resolveImageIntent(customerIntent, {
    productMode: input.productMode,
    forcedIntent: input.imageIntent ?? null,
  });

  if (intentResolution.status === "needs_clarification") {
    throw new Error(
      "Necesitamos aclarar el tipo de imagen antes de generar. Indica si es para plataforma, mejora profesional o publicidad.",
    );
  }

  const built = buildAdvertisingImagePrompt({
    customerIntent,
    productMode: input.productMode,
    intent: intentResolution.intent,
    providerMode: intentResolution.providerMode,
  });

  input.onStep?.(
    "image",
    built.acknowledgment || "Preparando tu imagen publicitaria...",
  );

  const formData = new FormData();
  formData.append("image", input.file);
  // Intent-specific Mode — marketplace reuses amazon/mercado-libre/premium.
  // Do NOT force "custom" for all Advertising Image jobs.
  formData.append("mode", built.providerMode);
  formData.append("aiInstructions", built.aiInstructions);
  // Marks this request for server-side Advertising Image auth/credit gate.
  formData.append(ADVERTISING_IMAGE_PURPOSE_FIELD, ADVERTISING_IMAGE_PURPOSE_VALUE);

  const response = await fetch("/api/enhancement", {
    method: "POST",
    body: formData,
  });

  const data = (await parseJsonResponse(response)) as {
    image?: string;
    error?: string;
    code?: string;
  };

  if (response.status === 401 || data.code === ADVERTISING_IMAGE_AUTH_REQUIRED_CODE) {
    throw new AdvertisingImageAuthRequiredError(
      data.error || ADVERTISING_IMAGE_AUTH_REQUIRED_MESSAGE,
    );
  }

  if (
    response.status === 402 ||
    data.code === ADVERTISING_IMAGE_PACKAGE_REQUIRED_CODE
  ) {
    throw new AdvertisingImagePackageRequiredError(
      data.error || ADVERTISING_IMAGE_PACKAGE_REQUIRED_MESSAGE,
    );
  }

  if (!response.ok || !data.image) {
    throw new Error(
      mapCreationError(data.error) ||
        "No pudimos crear tu imagen publicitaria.",
    );
  }

  input.onStep?.("done", "¡Listo!");

  return {
    premiumImage: data.image,
    imagePrompt: built.imagePrompt,
    imageIntent: built.intent,
  };
}

function packageRequiredPersistResult(): PersistCreationResult {
  return {
    projectId: null,
    assetId: null,
    shareSlug: null,
    status: "requires-package",
    code: ADVERTISING_IMAGE_PACKAGE_REQUIRED_CODE,
    message: ADVERTISING_IMAGE_PACKAGE_REQUIRED_MESSAGE,
    planesHref: ADVERTISING_IMAGE_PLANES_HREF,
  };
}

async function revokeClientUndeliveredPersist(input: {
  assetId: string;
  projectId: string;
  deleteProject: boolean;
}): Promise<void> {
  const supabase = createClient();
  const { error: assetError } = await supabase
    .from("assets")
    .delete()
    .eq("id", input.assetId);

  if (assetError) {
    console.error(
      "[persistCreationToLibrary] Failed to revoke undelivered asset",
      assetError,
    );
  }

  if (input.deleteProject) {
    const { error: projectError } = await supabase
      .from("projects")
      .delete()
      .eq("id", input.projectId);

    if (projectError) {
      console.error(
        "[persistCreationToLibrary] Failed to revoke undelivered project",
        projectError,
      );
    }
  }
}

export async function persistCreationToLibrary(
  input: PersistCreationInput,
): Promise<PersistCreationResult> {
  let finalResult: PersistCreationResult = {
    projectId: null,
    assetId: null,
    shareSlug: null,
    status: "idle",
  };

  try {
    logPersistCreationStage("auth.getUser:start");
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    logPersistCreationStage("auth.getUser:result", {
      hasUser: Boolean(user),
      userId: user?.id ?? null,
      authError,
    });

    if (authError || !user) {
      throw new BibliotecaAuthError();
    }

    const userId = user.id;
    logPersistCreationStage("user id", { userId });

    // Successful Advertising Image generation persist bills once per asset_id.
    // Finalizar / Commercial pass false and must not debit.
    const billAdvertising = shouldBillAdvertisingAsset({
      billAdvertisingAsset: input.billAdvertisingAsset,
      teaserVideoBlob: input.teaserVideoBlob,
    });

    // Hard gate BEFORE billable finished persist for standalone Advertising Images.
    if (billAdvertising) {
      logPersistCreationStage("entitlement preflight:start");
      const balancesResponse = await fetch("/api/entitlements/balances");
      if (balancesResponse.ok) {
        const balances = (await balancesResponse.json().catch(() => null)) as {
          advertisingAssetsRemaining?: number;
        } | null;
        const remaining = balances?.advertisingAssetsRemaining ?? 0;
        if (remaining < 1) {
          logPersistCreationStage("entitlement preflight:blocked", {
            remaining,
          });
          finalResult = packageRequiredPersistResult();
          logPersistCreationStage("final PersistCreationResult", finalResult);
          return finalResult;
        }
      } else {
        logPersistCreationStage("entitlement preflight:balances_unavailable", {
          status: balancesResponse.status,
        });
      }
    }

    const createdNewProject = !input.existingProjectId;
    const result = await persistStudioCreation({
      userId,
      originalFile: input.originalFile,
      enhancedDataUrl: input.enhancedDataUrl,
      teaserVideoBlob: input.teaserVideoBlob,
      imagePrompt: input.imagePrompt,
      videoPrompt: input.videoPrompt,
      customerIntent: input.customerIntent,
      visualGenerationIntent: input.visualGenerationIntent,
      promotionalOverlays: input.promotionalOverlays,
      productionProfile: input.productionProfile,
      overlayStyle: input.overlayStyle,
      requiredNarrativeBeats: input.requiredNarrativeBeats,
      mode: input.mode,
      projectMetadata: input.projectMetadata,
      existingProjectId: input.existingProjectId,
      existingAssetId: input.existingAssetId,
      generationMetadata: input.generationMetadata,
      onStage: logPersistCreationStage,
    });

    logPersistCreationStage("returned projectId", {
      projectId: result.projectId,
    });
    logPersistCreationStage("returned assetId", {
      assetId: result.assetId,
    });

    // Billable event: successful provider-backed Advertising Image generation.
    // Idempotent per asset_id (retries / Finalizar must not double-charge).
    // Commercial production sets billAdvertisingAsset: false and must not debit.
    if (billAdvertising && result.assetId) {
      logPersistCreationStage("entitlement consume:start", {
        assetId: result.assetId,
      });
      try {
        const consumeResponse = await fetch(
          "/api/entitlements/consume-advertising-asset",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ assetId: result.assetId }),
          },
        );
        const payload = (await consumeResponse.json().catch(() => null)) as {
          error?: string;
          code?: string;
          consumed?: boolean;
          alreadyConsumed?: boolean;
        } | null;

        if (
          consumeResponse.status === 402 ||
          payload?.code === "insufficient_entitlement"
        ) {
          logPersistCreationStage("entitlement consume:blocked_insufficient", {
            assetId: result.assetId,
          });
          await revokeClientUndeliveredPersist({
            assetId: result.assetId,
            projectId: result.projectId,
            deleteProject: createdNewProject,
          });
          finalResult = packageRequiredPersistResult();
          logPersistCreationStage("final PersistCreationResult", finalResult);
          return finalResult;
        }

        if (!consumeResponse.ok) {
          logPersistCreationStage("entitlement consume:failed", {
            status: consumeResponse.status,
            payload,
          });
          await revokeClientUndeliveredPersist({
            assetId: result.assetId,
            projectId: result.projectId,
            deleteProject: createdNewProject,
          });
          finalResult = {
            projectId: null,
            assetId: null,
            shareSlug: null,
            status: "idle",
          };
          logPersistCreationStage("final PersistCreationResult", finalResult);
          return finalResult;
        }

        logPersistCreationStage("entitlement consume:success", {
          assetId: result.assetId,
          consumed: payload?.consumed,
          alreadyConsumed: payload?.alreadyConsumed,
        });
      } catch (consumeError) {
        logPersistCreationStage("entitlement consume:network_error", {
          error: consumeError,
        });
        await revokeClientUndeliveredPersist({
          assetId: result.assetId,
          projectId: result.projectId,
          deleteProject: createdNewProject,
        });
        finalResult = {
          projectId: null,
          assetId: null,
          shareSlug: null,
          status: "idle",
        };
        logPersistCreationStage("final PersistCreationResult", finalResult);
        return finalResult;
      }
    }

    finalResult = {
      projectId: result.projectId,
      assetId: result.assetId,
      shareSlug: result.asset.share_slug ?? null,
      status: "saved",
    };
    logPersistCreationStage("final PersistCreationResult", finalResult);
    return finalResult;
  } catch (saveError) {
    logPersistCreationStage("caught exception", { error: saveError });

    if (saveError instanceof BibliotecaAuthError) {
      finalResult = {
        projectId: null,
        assetId: null,
        shareSlug: null,
        status: "local-only",
      };
      logPersistCreationStage("final PersistCreationResult", finalResult);
      return finalResult;
    }

    console.error(saveError);
    logPersistCreationStage("final PersistCreationResult", finalResult);
    return finalResult;
  }
}

/**
 * Server-first Commercial authorization for the current asset (no client balance gate).
 * Returns true when authorization succeeded (new debit or already consumed).
 * Returns false only on insufficient balance so caller can fall back to Stripe.
 * Unexpected errors throw — they must not open Stripe.
 */
async function tryConsumePrepaidCommercial(
  assetId: string,
  onStatus: PurchaseHdInput["onStatus"],
  traceId: string,
): Promise<boolean> {
  onStatus?.("Usando tu crédito de comercial...");

  const consumePayload = { assetId };
  traceRuntime(
    traceId,
    "POST /api/entitlements/consume-commercial request",
    consumePayload,
  );

  let consumeResponse: Response;
  try {
    consumeResponse = await fetch("/api/entitlements/consume-commercial", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Metaprom-Trace-Id": traceId,
      },
      body: JSON.stringify(consumePayload),
    });
  } catch (networkError) {
    traceRuntime(traceId, "POST /api/entitlements/consume-commercial fetch threw", {
      error: describeUnknownError(networkError),
    });
    throw networkError;
  }

  const consumeData = await readRuntimeResponseBody(
    consumeResponse,
    traceId,
    "POST /api/entitlements/consume-commercial",
  );

  if (consumeResponse.ok && consumeData.ok === true) {
    return true;
  }

  // Balance raced to zero — mutually exclusive fallback to Stripe commercial_1.
  if (
    consumeResponse.status === 402 ||
    consumeData.code === "insufficient_entitlement"
  ) {
    traceRuntime(traceId, "prepaid commercial insufficient; falling back to Stripe", {
      status: consumeResponse.status,
      body: consumeData,
    });
    return false;
  }

  throwRuntimeResponseError(
    traceId,
    "POST /api/entitlements/consume-commercial",
    consumeResponse,
    consumeData,
  );
}

export async function purchaseHdCommercial(
  input: PurchaseHdInput,
): Promise<PurchaseHdResult> {
  const traceId = createRuntimeTraceId();

  // Server-first prepaid authorization: do NOT gate on client balance.
  // consume-commercial is authoritative for already-authorized / new debit / 402.
  // Only explicit insufficient balance falls through to Stripe commercial_1.
  const consumed = await tryConsumePrepaidCommercial(
    input.assetId,
    input.onStatus,
    traceId,
  );
  if (consumed) {
    return fulfillPurchase(input.assetId, input.onStatus, traceId);
  }

  const checkoutPayload = {
    assetId: input.assetId,
    productKey: "commercial_1",
    paymentMethod: input.paymentMethod,
  };

  traceRuntime(traceId, "POST /api/payments/checkout request", checkoutPayload);

  let checkoutResponse: Response;
  try {
    checkoutResponse = await fetch("/api/payments/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Metaprom-Trace-Id": traceId,
      },
      body: JSON.stringify(checkoutPayload),
    });
  } catch (networkError) {
    traceRuntime(traceId, "POST /api/payments/checkout fetch threw", {
      error: describeUnknownError(networkError),
    });
    throw networkError;
  }

  const checkoutData = await readRuntimeResponseBody(
    checkoutResponse,
    traceId,
    "POST /api/payments/checkout",
  );

  if (!checkoutResponse.ok) {
    throwRuntimeResponseError(
      traceId,
      "POST /api/payments/checkout",
      checkoutResponse,
      checkoutData,
    );
  }

  const redirectUrl = readString(checkoutData.redirectUrl)?.trim();
  const sessionId = readString(checkoutData.sessionId);
  const oxxoReference = readString(checkoutData.oxxoReference);
  const provider = readString(checkoutData.provider);

  if (redirectUrl) {
    input.onStatus?.("Abriendo checkout seguro...");
    window.location.assign(redirectUrl);
    return {
      assetId: input.assetId,
      premiumVideoUrl: null,
      message: "Te llevamos al checkout seguro.",
      redirected: true,
    };
  }

  if (checkoutData.status === "awaiting_payment" && sessionId) {
    if (provider === "stripe" && !redirectUrl) {
      throw new Error(
        "Stripe checkout did not return a redirect URL. Cannot open hosted checkout.",
      );
    }

    input.onStatus?.(
      oxxoReference
        ? `Referencia OXXO: ${oxxoReference}. Confirma el pago para producir tu comercial HD.`
        : "Esperando confirmación de pago...",
    );

    await pollCheckoutCompletion(sessionId, traceId);
  }

  return fulfillPurchase(input.assetId, input.onStatus, traceId);
}

export async function completeCheckoutAfterRedirect(
  sessionId: string,
  onStatus?: (message: string) => void,
): Promise<PurchaseHdResult> {
  const traceId = createRuntimeTraceId();
  traceRuntime(traceId, "complete checkout after redirect", { sessionId });
  onStatus?.("Confirmando tu pago...");
  const checkout = await pollCheckoutCompletion(sessionId, traceId);

  if (!checkout.assetId) {
    throw new Error("No pudimos encontrar el activo de esta compra.");
  }

  return fulfillPurchase(checkout.assetId, onStatus, traceId);
}

export async function fulfillPurchase(
  assetId: string,
  onStatus?: (message: string) => void,
  traceId = createRuntimeTraceId(),
): Promise<PurchaseHdResult> {
  onStatus?.("Produciendo tu comercial HD...");

  traceRuntime(traceId, "POST /api/studio/premium-video request", { assetId });

  let response: Response;
  try {
    response = await fetch("/api/studio/premium-video", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Metaprom-Trace-Id": traceId,
      },
      body: JSON.stringify({ assetId }),
    });
  } catch (networkError) {
    traceRuntime(traceId, "POST /api/studio/premium-video fetch threw", {
      error: describeUnknownError(networkError),
    });
    throw networkError;
  }

  const data = await readRuntimeResponseBody(
    response,
    traceId,
    "POST /api/studio/premium-video",
  );

  if (!response.ok) {
    throwRuntimeResponseError(
      traceId,
      "POST /api/studio/premium-video",
      response,
      data,
    );
  }

  const asset = await fetchBibliotecaAssetById(assetId);

  if (asset?.premium_video_url) {
    return {
      assetId,
      premiumVideoUrl: asset.premium_video_url,
      message: "¡Listo! Tu comercial HD está disponible para descargar.",
    };
  }

  return {
    assetId,
    premiumVideoUrl: null,
    message: "Pago recibido. Tu comercial HD estará disponible pronto.",
  };
}

async function pollCheckoutCompletion(sessionId: string, traceId: string): Promise<{
  assetId?: string;
}> {
  while (true) {
    traceRuntime(traceId, "GET /api/payments/checkout request", { sessionId });

    let statusResponse: Response;
    try {
      statusResponse = await fetch(
        `/api/payments/checkout?sessionId=${encodeURIComponent(sessionId)}`,
        {
          headers: {
            "X-Metaprom-Trace-Id": traceId,
          },
        },
      );
    } catch (networkError) {
      traceRuntime(traceId, "GET /api/payments/checkout fetch threw", {
        error: describeUnknownError(networkError),
      });
      throw networkError;
    }

    const statusData = await readRuntimeResponseBody(
      statusResponse,
      traceId,
      "GET /api/payments/checkout",
    );

    if (statusData.status === "completed") {
      return { assetId: readId(statusData.assetId) };
    }

    if (statusData.status === "failed" || statusData.status === "cancelled") {
      throw new Error("El pago no se completó.");
    }

    if (!statusResponse.ok) {
      throwRuntimeResponseError(
        traceId,
        "GET /api/payments/checkout",
        statusResponse,
        statusData,
      );
    }

    await new Promise((resolve) => window.setTimeout(resolve, 3000));
  }
}

export function getAutoSaveMessage(status: AutoSaveStatus): string | null {
  switch (status) {
    case "saving":
      return "Guardando en tu biblioteca...";
    case "saved":
      return "Guardado automáticamente en tu biblioteca.";
    case "local-only":
      return "Guarda este trabajo en tu biblioteca personal.";
    case "requires-package":
      return ADVERTISING_IMAGE_PACKAGE_REQUIRED_MESSAGE;
    default:
      return null;
  }
}
