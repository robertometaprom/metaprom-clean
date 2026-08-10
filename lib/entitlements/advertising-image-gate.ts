/**
 * Client-safe Advertising Image entitlement gate helpers / UX contracts.
 * Hard gate applies at successful provider-backed generation persist.
 */

export const ADVERTISING_IMAGE_PACKAGE_REQUIRED_CODE =
  "insufficient_advertising_images" as const;

export const ADVERTISING_IMAGE_AUTH_REQUIRED_CODE =
  "advertising_image_auth_required" as const;

/** Customer-facing copy — do not expose entitlement/ledger terminology. */
export const ADVERTISING_IMAGE_PACKAGE_REQUIRED_MESSAGE =
  "Necesitas Imágenes Publicitarias disponibles para crear esta pieza.";

/** Anonymous Generate gate — registration invite. */
export const ADVERTISING_IMAGE_AUTH_REQUIRED_MESSAGE =
  "Guarda tu proyecto y crea tu primera Imagen Publicitaria gratis." as const;

export const ADVERTISING_IMAGE_WELCOME_AVAILABLE_MESSAGE =
  "Tu primera Imagen Publicitaria es gratis." as const;

export const ADVERTISING_IMAGE_PLANES_HREF = "/planes" as const;

/** FormData flag so /api/enhancement can distinguish Advertising Image vs Commercial. */
export const ADVERTISING_IMAGE_PURPOSE_FIELD = "creationPurpose" as const;
export const ADVERTISING_IMAGE_PURPOSE_VALUE = "advertising_image" as const;

/**
 * Standalone Advertising Image deliverable (bill + hard-gate) vs Commercial
 * production (teaser/HD commercial path — must not require Image packages).
 *
 * Explicit `billAdvertisingAsset` wins. Otherwise: image-only persist bills;
 * presence of a teaser video means Commercial production.
 */
export function shouldBillAdvertisingAsset(input: {
  billAdvertisingAsset?: boolean;
  teaserVideoBlob?: Blob | null;
  hasTeaserVideo?: boolean;
}): boolean {
  if (typeof input.billAdvertisingAsset === "boolean") {
    return input.billAdvertisingAsset;
  }

  if (typeof input.hasTeaserVideo === "boolean") {
    return !input.hasTeaserVideo;
  }

  return !input.teaserVideoBlob;
}
