import {
  BibliotecaAuthError,
  blobToDataUrl,
  fetchBibliotecaAssetById,
  type StudioProjectMetadata,
} from "@/lib/biblioteca";
import { mapCreationError } from "@/lib/creation-errors";
import type { PaymentMethod } from "@/lib/payments/types";
import type { Mode } from "@/lib/prompts";
import { toDestinationGenerationPayload } from "@/lib/destination-generation";
import type { StudioDestination } from "@/lib/studio-destination";
import { persistStudioCreation } from "@/lib/studio-persistence";
import {
  buildStudioImagePrompt,
  buildStudioVideoPrompt,
} from "@/lib/studio-prompts";
import { createClient } from "@/lib/supabase/client";

export type CreationStep = "image" | "video" | "done";

export type AutoSaveStatus = "idle" | "saving" | "saved" | "local-only";

export type CreateCommercialInput = {
  file: File;
  customerIntent: string;
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
};

export type PersistCreationInput = {
  originalFile: File;
  enhancedDataUrl: string;
  teaserVideoBlob?: Blob;
  imagePrompt: string;
  videoPrompt: string;
  customerIntent: string;
  mode: Mode;
  projectMetadata: StudioProjectMetadata;
  existingProjectId?: string | null;
  existingAssetId?: string | null;
  localDraftKey?: string;
};

export type PersistCreationResult = {
  projectId: string | null;
  assetId: string | null;
  shareSlug: string | null;
  status: AutoSaveStatus;
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
): Promise<{ image?: string; error?: string }> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return { error: `Error del servidor (${response.status}).` };
  }

  try {
    return (await response.json()) as { image?: string; error?: string };
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

  if (!response.ok || !data.image) {
    throw new Error(
      mapCreationError(data.error) || "No pudimos preparar tu escena comercial.",
    );
  }

  input.onStep?.("video", "Preparando tu comercial...");

  const videoPrompt = buildStudioVideoPrompt(customerIntent, "teaser", destination);
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
  };
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

    const result = await persistStudioCreation({
      userId,
      originalFile: input.originalFile,
      enhancedDataUrl: input.enhancedDataUrl,
      teaserVideoBlob: input.teaserVideoBlob,
      imagePrompt: input.imagePrompt,
      videoPrompt: input.videoPrompt,
      customerIntent: input.customerIntent,
      mode: input.mode,
      projectMetadata: input.projectMetadata,
      existingProjectId: input.existingProjectId,
      existingAssetId: input.existingAssetId,
      onStage: logPersistCreationStage,
    });

    logPersistCreationStage("returned projectId", {
      projectId: result.projectId,
    });
    logPersistCreationStage("returned assetId", {
      assetId: result.assetId,
    });

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

    if (saveError instanceof BibliotecaAuthError && input.localDraftKey) {
      try {
        sessionStorage.setItem(
          input.localDraftKey,
          JSON.stringify({
            premiumImage: input.enhancedDataUrl,
            videoDataUrl: input.teaserVideoBlob
              ? await blobToDataUrl(input.teaserVideoBlob)
              : undefined,
            customerIntent: input.customerIntent,
          }),
        );
      } catch {
        // ignore storage errors
      }

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

export async function purchaseHdCommercial(
  input: PurchaseHdInput,
): Promise<PurchaseHdResult> {
  const traceId = createRuntimeTraceId();
  const checkoutPayload = {
    assetId: input.assetId,
    productId: "commercial-video",
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

  const redirectUrl = readString(checkoutData.redirectUrl);
  const sessionId = readString(checkoutData.sessionId);
  const oxxoReference = readString(checkoutData.oxxoReference);

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
      return "Guardado en este dispositivo. Inicia sesión para conservarlo.";
    default:
      return null;
  }
}
