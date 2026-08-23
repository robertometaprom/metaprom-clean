import type { Metadata } from "next";
import PublicCommercialPage from "@/components/public/PublicCommercialPage";
import PublicPreviewInvalidSlug from "@/components/public/states/PublicPreviewInvalidSlug";
import PublicPreviewNotFound from "@/components/public/states/PublicPreviewNotFound";
import PublicPreviewUnavailable from "@/components/public/states/PublicPreviewUnavailable";
import { getLocale } from "@/lib/i18n";
import { getPublicCommercialContent } from "@/lib/public-commercial/content";
import { resolvePublicPreviewPage } from "@/lib/preview/public-preview";
import { buildPublicPreviewImageUrl } from "@/lib/preview/share-url";

type PageProps = {
  params: Promise<{ share_slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { share_slug } = await params;
  const locale = await getLocale();
  const result = await resolvePublicPreviewPage(share_slug, { locale });

  if (result.kind !== "preview") {
    const labels = getPublicCommercialContent(locale);
    const stateLabels =
      result.kind === "invalid_slug"
        ? labels.states.invalidSlug
        : result.kind === "unavailable"
          ? labels.states.unavailable
          : labels.states.notFound;

    return {
      title: stateLabels.title,
      description: stateLabels.description,
      robots: { index: false, follow: false },
    };
  }

  const ogImageUrl = result.preview.posterUrl
    ? buildPublicPreviewImageUrl(result.preview.shareSlug)
    : undefined;

  return {
    title: result.preview.title,
    description: result.preview.description,
    robots: { index: false, follow: false },
    alternates: { canonical: result.preview.publicUrl },
    openGraph: {
      title: result.preview.title,
      description: result.preview.description,
      url: result.preview.publicUrl,
      siteName: "Metaprom AI",
      type: "website",
      ...(ogImageUrl
        ? {
            images: [
              {
                url: ogImageUrl,
                alt: result.preview.title,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: ogImageUrl ? "summary_large_image" : "summary",
      title: result.preview.title,
      description: result.preview.description,
      ...(ogImageUrl ? { images: [ogImageUrl] } : {}),
    },
  };
}

export default async function PublicPreviewRoute({ params }: PageProps) {
  const { share_slug } = await params;
  const locale = await getLocale();
  const labels = getPublicCommercialContent(locale);
  const result = await resolvePublicPreviewPage(share_slug, { locale });

  if (result.kind === "invalid_slug") {
    return (
      <PublicPreviewInvalidSlug
        labels={{
          ...labels.states.invalidSlug,
          ctaLabel: labels.ctaLabel,
          ctaHref: labels.ctaHref,
        }}
      />
    );
  }

  if (result.kind === "not_found") {
    return (
      <PublicPreviewNotFound
        labels={{
          ...labels.states.notFound,
          ctaLabel: labels.ctaLabel,
          ctaHref: labels.ctaHref,
        }}
      />
    );
  }

  if (result.kind === "unavailable") {
    return (
      <PublicPreviewUnavailable
        labels={{
          ...labels.states.unavailable,
          ctaLabel: labels.ctaLabel,
          ctaHref: labels.ctaHref,
        }}
      />
    );
  }

  return (
    <PublicCommercialPage
      preview={result.preview}
      labels={labels}
      locale={locale}
    />
  );
}
