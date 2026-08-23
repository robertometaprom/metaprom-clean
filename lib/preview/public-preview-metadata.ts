import {
  buildPublicPreviewImagePath,
  buildPublicPreviewStreamPath,
  buildPublicPreviewUrl,
} from "@/lib/preview/share-url";
import type { PublicPreviewKind } from "@/lib/preview/types";

export type PublicPreviewMetadata = {
  shareSlug: string;
  publicUrl: string;
  title: string;
  description: string;
  ogImageUrl: string | null;
  streamPath: string | null;
  openGraphImagePath: string;
};

export type PublicPreviewMetadataInput = {
  shareSlug: string;
  posterImageUrl?: string | null;
  locale?: "es" | "en";
  kind?: PublicPreviewKind;
};

function buildPreviewTitle(
  locale: "es" | "en",
  kind: PublicPreviewKind,
): string {
  const isImage = kind === "advertising_image";

  if (isImage) {
    return locale === "es"
      ? "Imagen creada con Metaprom AI"
      : "Image created with Metaprom AI";
  }

  return locale === "es"
    ? "Comercial creado con Metaprom AI"
    : "Commercial created with Metaprom AI";
}

function buildPreviewDescription(
  locale: "es" | "en",
  kind: PublicPreviewKind,
): string {
  if (kind === "advertising_image") {
    return locale === "es"
      ? "Mira esta imagen publicitaria y crea la tuya gratis con Metaprom."
      : "See this advertising image and create yours free with Metaprom.";
  }

  return locale === "es"
    ? "Mira este comercial premium y crea el tuyo gratis con Metaprom."
    : "Watch this premium-style commercial and create yours free with Metaprom.";
}

/**
 * Metadata contract for `/p/[slug]` SSR + Open Graph (implemented in PR2/PR3).
 */
export function buildPublicPreviewMetadata(
  input: PublicPreviewMetadataInput,
): PublicPreviewMetadata {
  const locale = input.locale ?? "es";
  const shareSlug = input.shareSlug;
  const kind = input.kind ?? "commercial";

  return {
    shareSlug,
    publicUrl: buildPublicPreviewUrl(shareSlug),
    title: buildPreviewTitle(locale, kind),
    description: buildPreviewDescription(locale, kind),
    ogImageUrl: input.posterImageUrl ?? null,
    streamPath:
      kind === "advertising_image"
        ? null
        : buildPublicPreviewStreamPath(shareSlug),
    openGraphImagePath: buildPublicPreviewImagePath(shareSlug),
  };
}
