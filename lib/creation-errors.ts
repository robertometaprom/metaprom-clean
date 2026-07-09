const CUSTOMER_ERROR_FALLBACK =
  "Algo salió mal. Intenta de nuevo con otra foto.";

const BRAND_REJECTION_SUGGESTIONS = `Prueba con:

• tu propio producto
• un producto sin marcas visibles
• o cubre/retira el logo antes de generar.`;

export type SafetyRejectionCategory =
  | "logo"
  | "character"
  | "packaging"
  | "policy";

type SafetyRejectionDetails = {
  category: SafetyRejectionCategory;
  message: string;
};

const EXACT_ERROR_MAP: Record<string, string> = {
  "Enhancement failed": "No pudimos preparar tu escena comercial.",
  "No image uploaded": "Sube una foto para continuar.",
  "No image uploaded.": "Sube una foto para continuar.",
  "No image generated": "No pudimos preparar tu escena comercial.",
  "Image generation was blocked":
    "No pudimos crear este comercial porque la imagen contiene elementos de marca protegidos o contenido que no podemos usar para generación comercial.",
  "Video generation failed.": "No pudimos crear tu comercial.",
  "Video generation failed before submission.": "No pudimos crear tu comercial.",
  "No video was generated.": "No pudimos crear tu comercial.",
  "Prompt is required.": "Cuéntanos qué quieres promocionar para continuar.",
  "Custom mode requires AI Instructions.":
    "Cuéntanos qué quieres promocionar para continuar.",
  "Unable to normalize the uploaded image. Please try a different photo.":
    "No pudimos usar esta foto. Prueba con otra imagen en JPG o PNG.",
  "Unsupported image format. Please upload JPEG, PNG, WEBP, HEIC, or HEIF.":
    "Formato no compatible. Usa JPG, PNG o WEBP.",
  "Unsupported image format. Please upload JPEG, PNG, or WEBP.":
    "Formato no compatible. Usa JPG, PNG o WEBP.",
  "Authentication required.": "Inicia sesión para continuar.",
  "Unable to start checkout.": "No pudimos iniciar el pago.",
  "Asset not found.": "No encontramos tu comercial. Intenta crear uno nuevo.",
  "Premium video requires completed payment.":
    "Confirma tu pago para producir el comercial HD.",
};

function stripProviderSafetyPrefix(message: string): string {
  return message
    .replace(/^video blocked by safety filters:\s*/i, "")
    .replace(/^video blocked by rai filters:\s*/i, "")
    .replace(/^video generation failed:\s*/i, "")
    .replace(/^image generation was blocked\.?\s*/i, "")
    .trim();
}

function classifySafetyRejection(rawDetail: string): SafetyRejectionCategory {
  const lower = rawDetail.toLowerCase();

  if (
    /logo|trademark|brand name|registered mark|corporate identity|company name/.test(
      lower,
    )
  ) {
    return "logo";
  }

  if (
    /character|celebrity|famous person|public figure|fictional|cartoon|mascot|animated character|ip character|franchise/.test(
      lower,
    )
  ) {
    return "character";
  }

  if (
    /copyright|packaging|label design|trade dress|product design|branded packaging|recognizable product/.test(
      lower,
    )
  ) {
    return "packaging";
  }

  return "policy";
}

function buildSafetyRejectionMessage(
  category: SafetyRejectionCategory,
): string {
  const lead =
    "No pudimos crear este comercial porque la imagen contiene elementos de marca protegidos o contenido que no podemos usar para generación comercial.";

  const hints: Record<SafetyRejectionCategory, string | null> = {
    logo:
      "Es probable que haya un logo o marca registrada visible en la foto.",
    character:
      "Es probable que la imagen incluya un personaje o figura reconocible protegida.",
    packaging:
      "Es probable que el empaque o diseño del producto esté protegido por derechos de autor.",
    policy: null,
  };

  const hint = hints[category];
  if (hint) {
    return `${lead}\n\n${hint}\n\n${BRAND_REJECTION_SUGGESTIONS}`;
  }

  return `${lead}\n\n${BRAND_REJECTION_SUGGESTIONS}`;
}

export function detectSafetyRejection(
  message?: string,
): SafetyRejectionDetails | null {
  if (!message) return null;

  const lower = message.toLowerCase();
  const isSafetySignal =
    lower.includes("safety filter") ||
    lower.includes("blocked by safety") ||
    lower.includes("blocked by rai") ||
    lower.includes("rai filter") ||
    lower.includes("rai_media") ||
    lower.includes("responsible ai") ||
    lower.includes("image generation was blocked") ||
    lower.includes("content policy") ||
    lower.includes("usage policy") ||
    (lower.includes("blocked") &&
      (lower.includes("video") ||
        lower.includes("image") ||
        lower.includes("content") ||
        lower.includes("policy") ||
        lower.includes("rai")));

  if (!isSafetySignal) return null;

  const detail = stripProviderSafetyPrefix(message);
  const category = classifySafetyRejection(detail);

  return {
    category,
    message: buildSafetyRejectionMessage(category),
  };
}

export function mapCreationError(message?: string): string | undefined {
  if (!message) return undefined;

  if (EXACT_ERROR_MAP[message]) {
    const exact = EXACT_ERROR_MAP[message];
    if (message === "Image generation was blocked") {
      return buildSafetyRejectionMessage("policy");
    }
    return exact;
  }

  const safetyRejection = detectSafetyRejection(message);
  if (safetyRejection) {
    return safetyRejection.message;
  }

  const lower = message.toLowerCase();

  if (
    lower.includes("vertex") ||
    lower.includes("veo") ||
    lower.includes("openai") ||
    lower.includes("google cloud") ||
    lower.includes("service agent") ||
    lower.includes("gcs") ||
    lower.includes("genai")
  ) {
    return CUSTOMER_ERROR_FALLBACK;
  }

  if (
    lower.includes("resource_exhausted") ||
    lower.includes("quota") ||
    lower.includes("429")
  ) {
    return "Estamos produciendo muchos comerciales ahora mismo. Intenta de nuevo en unos minutos.";
  }

  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "La producción tardó más de lo esperado. Intenta de nuevo.";
  }

  if (
    message.startsWith("Error del servidor") ||
    message.startsWith("Respuesta inválida") ||
    message.startsWith("{") ||
    message.includes("RESOURCE_EXHAUSTED")
  ) {
    return CUSTOMER_ERROR_FALLBACK;
  }

  return CUSTOMER_ERROR_FALLBACK;
}
