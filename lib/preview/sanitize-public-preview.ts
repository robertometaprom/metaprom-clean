import {
  buildPublicPreviewImagePath,
  buildPublicPreviewStreamPath,
} from "@/lib/preview/share-url";
import type {
  PreviewVisibility,
  PublicPreview,
  PublicPreviewKind,
} from "@/lib/preview/types";

export type SanitizedPublicPreviewInput = {
  shareSlug: string;
  kind: PublicPreviewKind;
  publicUrl: string;
  title: string;
  description: string;
  hasPoster: boolean;
  industry: string | null;
  visibility: PreviewVisibility;
  createdAt: string;
  updatedAt: string;
};

/**
 * Public client payload: branded Metaprom paths only.
 * Never includes signed storage URLs, original photos, Premium HD, or owner identity.
 */
export function sanitizePublicPreview(
  input: SanitizedPublicPreviewInput,
): PublicPreview {
  const isAdvertisingImage = input.kind === "advertising_image";

  return {
    shareSlug: input.shareSlug,
    kind: input.kind,
    publicUrl: input.publicUrl,
    title: input.title,
    description: input.description,
    posterUrl: input.hasPoster
      ? buildPublicPreviewImagePath(input.shareSlug)
      : null,
    originalPhotoUrl: null,
    streamPath: isAdvertisingImage
      ? null
      : buildPublicPreviewStreamPath(input.shareSlug),
    industry: input.industry,
    visibility: input.visibility,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}
