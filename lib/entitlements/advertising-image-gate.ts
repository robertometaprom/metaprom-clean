/**
 * Client-safe Advertising Image entitlement gate helpers / UX contracts.
 * Hard gate applies only to standalone Advertising Image first-persist.
 */

export const ADVERTISING_IMAGE_PACKAGE_REQUIRED_CODE =
  "insufficient_advertising_images" as const;

/** Customer-facing copy — do not expose entitlement/ledger terminology. */
export const ADVERTISING_IMAGE_PACKAGE_REQUIRED_MESSAGE =
  "Necesitas Imágenes Publicitarias disponibles para crear esta pieza.";

export const ADVERTISING_IMAGE_PLANES_HREF = "/planes" as const;

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
