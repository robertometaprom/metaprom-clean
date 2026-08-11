export const IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif";

/** Batch Multi-Photo Phase A — local selection limits only. */
export const MAX_BATCH_SOURCE_FILES = 40;
export const MAX_SOURCE_FILE_BYTES = 20 * 1024 * 1024;

const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const SUPPORTED_IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|heic|heif)$/i;

export function sourceFileIdentity(file: File): string {
  return `${file.name}::${file.size}::${file.lastModified}`;
}

export function isSupportedSourceImage(file: File): boolean {
  const mime = file.type.trim().toLowerCase();
  if (mime && SUPPORTED_IMAGE_MIME_TYPES.has(mime)) return true;
  // Some browsers omit MIME for HEIC/HEIF — fall back to extension.
  return SUPPORTED_IMAGE_EXTENSIONS.test(file.name);
}

export type SourceFileValidationRejectionReason =
  | "unsupported"
  | "too_large"
  | "duplicate"
  | "batch_full";

export type SourceFileValidationResult = {
  accepted: File[];
  rejected: Array<{ file: File; reason: SourceFileValidationRejectionReason }>;
  /** Slots still available before hitting MAX_BATCH_SOURCE_FILES. */
  remainingSlots: number;
};

/**
 * Validate and filter candidate files for Studio source selection.
 * Preserves valid files; reports rejected ones. Does not hash contents.
 */
export function validateSourceImageFiles(
  candidates: File[],
  existing: File[],
): SourceFileValidationResult {
  const existingKeys = new Set(existing.map(sourceFileIdentity));
  const accepted: File[] = [];
  const rejected: SourceFileValidationResult["rejected"] = [];
  let remainingSlots = Math.max(0, MAX_BATCH_SOURCE_FILES - existing.length);

  for (const file of candidates) {
    if (remainingSlots <= 0) {
      rejected.push({ file, reason: "batch_full" });
      continue;
    }

    if (!isSupportedSourceImage(file)) {
      rejected.push({ file, reason: "unsupported" });
      continue;
    }

    if (file.size > MAX_SOURCE_FILE_BYTES) {
      rejected.push({ file, reason: "too_large" });
      continue;
    }

    const key = sourceFileIdentity(file);
    if (existingKeys.has(key)) {
      rejected.push({ file, reason: "duplicate" });
      continue;
    }

    existingKeys.add(key);
    accepted.push(file);
    remainingSlots -= 1;
  }

  return { accepted, rejected, remainingSlots };
}

export function formatSourceFileSelectionMessage(
  acceptedCount: number,
  rejected: SourceFileValidationResult["rejected"],
): string | null {
  if (rejected.length === 0) {
    return acceptedCount > 0 ? null : "No se agregaron fotos.";
  }

  const tooLarge = rejected.filter((item) => item.reason === "too_large").length;
  const unsupported = rejected.filter(
    (item) => item.reason === "unsupported",
  ).length;
  const batchFull = rejected.filter((item) => item.reason === "batch_full").length;
  const duplicate = rejected.filter((item) => item.reason === "duplicate").length;

  const parts: string[] = [];
  if (acceptedCount > 0) {
    parts.push(
      acceptedCount === 1
        ? "1 foto agregada"
        : `${acceptedCount} fotos agregadas`,
    );
  }

  const rejectParts: string[] = [];
  if (tooLarge > 0) {
    rejectParts.push(
      tooLarge === 1
        ? "1 archivo no pudo agregarse porque excede 20 MB"
        : `${tooLarge} archivos no pudieron agregarse porque exceden 20 MB`,
    );
  }
  if (unsupported > 0) {
    rejectParts.push(
      unsupported === 1
        ? "1 archivo no es un formato soportado (JPEG, PNG, WEBP, HEIC, HEIF)"
        : `${unsupported} archivos no son un formato soportado (JPEG, PNG, WEBP, HEIC, HEIF)`,
    );
  }
  if (batchFull > 0) {
    rejectParts.push(
      `máximo ${MAX_BATCH_SOURCE_FILES} fotos por lote`,
    );
  }
  if (duplicate > 0) {
    rejectParts.push(
      duplicate === 1
        ? "1 archivo ya estaba seleccionado"
        : `${duplicate} archivos ya estaban seleccionados`,
    );
  }

  if (rejectParts.length > 0) {
    parts.push(rejectParts.join(". ") + ".");
  }

  return parts.join(". ");
}

export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return (
    /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    ) ||
    (navigator.maxTouchPoints > 1 && window.matchMedia("(max-width: 768px)").matches)
  );
}

export function fileFromWebcamCapture(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
): File | null {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) return null;

  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;

  context.drawImage(video, 0, 0, width, height);

  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new File([bytes], `metaprom-capture-${Date.now()}.jpg`, { type: mime });
}
