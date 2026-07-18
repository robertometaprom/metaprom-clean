export type PreviewVisibility = "public" | "unlisted" | "private";

export type PublicPreview = {
  shareSlug: string;
  publicUrl: string;
  title: string;
  description: string;
  posterUrl: string | null;
  originalPhotoUrl: string | null;
  streamPath: string;
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
  teaserVideoPath: string;
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
