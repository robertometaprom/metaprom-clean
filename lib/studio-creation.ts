import {
  BibliotecaAuthError,
  blobToDataUrl,
  fetchBibliotecaAssetById,
  getBibliotecaUserId,
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
  try {
    const userId = await getBibliotecaUserId();
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
    });

    return {
      projectId: result.projectId,
      assetId: result.assetId,
      status: "saved",
    };
  } catch (saveError) {
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

      return { projectId: null, assetId: null, status: "local-only" };
    }

    console.error(saveError);
    return { projectId: null, assetId: null, status: "idle" };
  }
}

export async function purchaseHdCommercial(
  input: PurchaseHdInput,
): Promise<PurchaseHdResult> {
  const checkoutResponse = await fetch("/api/payments/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      assetId: input.assetId,
      productId: "commercial-video",
      paymentMethod: input.paymentMethod,
    }),
  });

  const checkoutData = (await checkoutResponse.json()) as {
    error?: string;
    sessionId?: string;
    status?: string;
    oxxoReference?: string;
    redirectUrl?: string;
  };

  if (!checkoutResponse.ok) {
    throw new Error(
      mapCreationError(checkoutData.error) || "No pudimos iniciar el pago.",
    );
  }

  if (checkoutData.redirectUrl) {
    input.onStatus?.("Abriendo checkout seguro...");
    window.location.assign(checkoutData.redirectUrl);
    return {
      assetId: input.assetId,
      premiumVideoUrl: null,
      message: "Te llevamos al checkout seguro.",
      redirected: true,
    };
  }

  if (checkoutData.status === "awaiting_payment" && checkoutData.sessionId) {
    input.onStatus?.(
      checkoutData.oxxoReference
        ? `Referencia OXXO: ${checkoutData.oxxoReference}. Confirma el pago para producir tu comercial HD.`
        : "Esperando confirmación de pago...",
    );

    await pollCheckoutCompletion(checkoutData.sessionId);
  }

  return generatePremiumAfterPayment(input.assetId, input.onStatus);
}

export async function completeCheckoutAfterRedirect(
  sessionId: string,
  onStatus?: (message: string) => void,
): Promise<PurchaseHdResult> {
  onStatus?.("Confirmando tu pago...");
  const checkout = await pollCheckoutCompletion(sessionId);

  if (!checkout.assetId) {
    throw new Error("No pudimos encontrar el activo de esta compra.");
  }

  return generatePremiumAfterPayment(checkout.assetId, onStatus);
}

async function generatePremiumAfterPayment(
  assetId: string,
  onStatus?: (message: string) => void,
): Promise<PurchaseHdResult> {
  onStatus?.("Produciendo tu comercial HD...");

  const response = await fetch("/api/studio/premium-video", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assetId }),
  });

  const data = (await response.json()) as { error?: string; status?: string };

  if (!response.ok) {
    throw new Error(
      mapCreationError(data.error) || "No pudimos producir tu comercial HD.",
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

async function pollCheckoutCompletion(sessionId: string): Promise<{
  assetId?: string;
}> {
  while (true) {
    const statusResponse = await fetch(
      `/api/payments/checkout?sessionId=${encodeURIComponent(sessionId)}`,
    );
    const statusData = (await statusResponse.json()) as {
      status?: string;
      error?: string;
      assetId?: string;
    };

    if (statusData.status === "completed") {
      return { assetId: statusData.assetId };
    }

    if (statusData.status === "failed" || statusData.status === "cancelled") {
      throw new Error("El pago no se completó.");
    }

    if (!statusResponse.ok) {
      throw new Error(
        mapCreationError(statusData.error) || "No pudimos confirmar el pago.",
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
