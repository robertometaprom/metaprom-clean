import PublicPreviewNotFound from "@/components/public/states/PublicPreviewNotFound";
import { getLocale } from "@/lib/i18n";
import { getPublicCommercialContent } from "@/lib/public-commercial/content";

export default async function PublicPreviewNotFoundRoute() {
  const locale = await getLocale();
  const labels = getPublicCommercialContent(locale);

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
