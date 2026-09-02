/**
 * Zero-cost local Preview handoff fixture (?ux4aReview=1).
 * Hydrates post-generation Preview state without calling generation providers.
 */

export const UX4A_FIXTURE_VIDEO_URL = "/showcase/coffee/commercial.mp4";
export const UX4A_FIXTURE_BEFORE_URL = "/showcase/coffee/before.jpg";
export const UX4A_FIXTURE_PREMIUM_URL = "/showcase/coffee/premium.jpg";

/** Local visual-only REVIEW mock slug — not a persisted production share. */
export const UX4A_REVIEW_MOCK_SHARE_SLUG = "UX4AREVIEW2";

/**
 * UX4A local Preview mock gate.
 * Requires ?ux4aReview=1 AND (development OR loopback host).
 * Never a public production shortcut.
 */
export function isUx4aReviewMockRequest(
  search: string = typeof window !== "undefined" ? window.location.search : "",
  hostname: string = typeof window !== "undefined" ? window.location.hostname : "",
  nodeEnv: string | undefined = process.env.NODE_ENV,
): boolean {
  if (typeof window === "undefined" && search === "" && hostname === "") {
    return false;
  }

  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  if (params.get("ux4aReview") !== "1") {
    return false;
  }

  const isLoopback =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]";

  if (isLoopback) return true;
  // Non-loopback: only when explicitly in development (local LAN / tooling).
  // Never enable on production NODE_ENV hosts.
  return nodeEnv === "development";
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const mime = blob.type || "application/octet-stream";

  if (typeof Buffer !== "undefined") {
    return `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
  }

  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

export type Ux4aPreviewHandoffAssets = {
  originalFile: File;
  enhancedDataUrl: string;
  teaserBlob: Blob;
  videoUrl: string;
};

/**
 * Load checked-in showcase media for real draft persistence.
 * Does not call generation providers or consume paid credits.
 */
export async function loadUx4aPreviewHandoffAssets(
  fetchImpl: typeof fetch = fetch,
): Promise<Ux4aPreviewHandoffAssets> {
  const [beforeRes, premiumRes, videoRes] = await Promise.all([
    fetchImpl(UX4A_FIXTURE_BEFORE_URL),
    fetchImpl(UX4A_FIXTURE_PREMIUM_URL),
    fetchImpl(UX4A_FIXTURE_VIDEO_URL),
  ]);

  if (!beforeRes.ok || !premiumRes.ok || !videoRes.ok) {
    throw new Error("No pudimos cargar el comercial de prueba local.");
  }

  const [beforeBlob, premiumBlob, teaserBlob] = await Promise.all([
    beforeRes.blob(),
    premiumRes.blob(),
    videoRes.blob(),
  ]);

  const originalFile = new File([beforeBlob], "before.jpg", {
    type: beforeBlob.type || "image/jpeg",
  });
  const enhancedDataUrl = await blobToDataUrl(premiumBlob);

  return {
    originalFile,
    enhancedDataUrl,
    teaserBlob,
    videoUrl: UX4A_FIXTURE_VIDEO_URL,
  };
}
