export type PreviewVisibility = "public" | "unlisted" | "private";

/** Public landing media kind — commercial teaser vs advertising image. */
export type PublicPreviewKind = "commercial" | "advertising_image";

export type PublicPreview = {
  shareSlug: string;
  kind: PublicPreviewKind;
  publicUrl: string;
  title: string;
  description: string;
  /** Metaprom-relative image path (`/api/public/{slug}/image`), never a storage URL. */
  posterUrl: string | null;
  /** Always null on public share — original customer photos are never exposed. */
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

export type PublicPreviewStorageSource = "library" | "studio_drafts";

/**
 * Server-side resolution result. Never expose via the public API.
 */
export type ResolvedPublicCommercial = {
  shareSlug: string;
  kind: PublicPreviewKind;
  teaserVideoPath: string | null;
  posterImagePath: string | null;
  /** Always null for public resolution — original photos stay private. */
  originalPhotoPath: string | null;
  customerIntent: string | null;
  industry: string | null;
  visibility: PreviewVisibility;
  createdAt: string;
  updatedAt: string;
  /** Server-only hint for signing the correct private bucket. */
  storageSource?: PublicPreviewStorageSource;
};

export function isPubliclyAccessiblePreview(
  visibility: PreviewVisibility,
): boolean {
  return visibility === "public" || visibility === "unlisted";
}
