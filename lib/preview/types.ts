export type PreviewVisibility = "public" | "unlisted" | "private";

/** Public landing media kind — commercial teaser vs advertising image. */
export type PublicPreviewKind = "commercial" | "advertising_image";

export type PublicPreview = {
  shareSlug: string;
  kind: PublicPreviewKind;
  publicUrl: string;
  title: string;
  description: string;
  posterUrl: string | null;
  /** Commercial-only. Always null for advertising_image (never expose source photo). */
  originalPhotoUrl: string | null;
  /** Commercial teaser stream path. Null for advertising_image. */
  streamPath: string | null;
  industry: string | null;
  visibility: PreviewVisibility;
  createdAt: string;
  updatedAt: string;
};

export type PublicPreviewPageResult =
  | { kind: "preview"; preview: PublicPreview }
  | { kind: "invalid_slug" }
  | { kind: "not_found" }
  | { kind: "unavailable" };

/**
 * Server-side resolution result. Never expose via the public API.
 */
export type ResolvedPublicCommercial = {
  shareSlug: string;
  kind: PublicPreviewKind;
  teaserVideoPath: string | null;
  posterImagePath: string | null;
  originalPhotoPath: string | null;
  customerIntent: string | null;
  industry: string | null;
  visibility: PreviewVisibility;
  createdAt: string;
  updatedAt: string;
};

export function isPubliclyAccessiblePreview(
  visibility: PreviewVisibility,
): boolean {
  return visibility === "public" || visibility === "unlisted";
}
