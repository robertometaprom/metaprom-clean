import PublicPreviewLoading from "@/components/public/states/PublicPreviewLoading";
import { getLocale } from "@/lib/i18n";
import { getPublicCommercialContent } from "@/lib/public-commercial/content";

export default async function PublicPreviewLoadingRoute() {
  const locale = await getLocale();
  const labels = getPublicCommercialContent(locale);

  return <PublicPreviewLoading labels={labels} />;
}
