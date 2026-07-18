import {
  buildPublicPreviewStreamPath,
  buildPublicPreviewUrl,
} from "@/lib/preview/share-url";

export type PublicPreviewMetadata = {
  shareSlug: string;
  publicUrl: string;
  title: string;
  description: string;
  ogImageUrl: string | null;
  streamPath: string;
  openGraphImagePath: string;
};

export type PublicPreviewMetadataInput = {
  shareSlug: string;
  customerIntent?: string | null;
  posterImageUrl?: string | null;
  locale?: "es" | "en";
};

function buildPreviewTitle(
  customerIntent: string | null | undefined,
  locale: "es" | "en",
): string {
  const trimmed = customerIntent?.trim();

  if (trimmed) {
    const shortened =
      trimmed.length > 72 ? `${trimmed.slice(0, 69).trimEnd()}...` : trimmed;

    return locale === "es"
      ? `${shortened} · Comercial con Metaprom`
      : `${shortened} · Commercial by Metaprom`;
  }

  return locale === "es"
    ? "Comercial creado con Metaprom"
    : "Commercial created with Metaprom";
}

function buildPreviewDescription(locale: "es" | "en"): string {
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

  return {
    shareSlug,
    publicUrl: buildPublicPreviewUrl(shareSlug),
    title: buildPreviewTitle(input.customerIntent, locale),
    description: buildPreviewDescription(locale),
    ogImageUrl: input.posterImageUrl ?? null,
    streamPath: buildPublicPreviewStreamPath(shareSlug),
    openGraphImagePath: `/p/${shareSlug}/opengraph-image`,
  };
}
