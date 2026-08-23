import type { PublicPreview } from "@/lib/preview/types";
import type { PublicCommercialContent } from "@/lib/public-commercial/content";
import PublicCommercialCta from "@/components/public/PublicCommercialCta";
import PublicCommercialFooter from "@/components/public/PublicCommercialFooter";
import PublicCommercialVideo from "@/components/public/PublicCommercialVideo";
import ShareOpenedBeacon from "@/components/public/ShareOpenedBeacon";

type PublicCommercialPageProps = {
  preview: PublicPreview;
  labels: PublicCommercialContent;
  locale?: "es" | "en";
};

export default function PublicCommercialPage({
  preview,
  labels,
  locale = "es",
}: PublicCommercialPageProps) {
  const isAdvertisingImage = preview.kind === "advertising_image";

  return (
    <main className="min-h-screen bg-black text-[#F5F5F0]">
      <ShareOpenedBeacon
        shareSlug={preview.shareSlug}
        assetType={preview.kind}
      />
      <div className="mx-auto w-full max-w-lg px-4 py-6 md:max-w-2xl md:py-10">
        <section
          aria-label={
            isAdvertisingImage ? labels.imageLabel : labels.commercialLabel
          }
        >
          {isAdvertisingImage ? (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
              {preview.posterUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- public image proxy
                <img
                  src={preview.posterUrl}
                  alt={preview.title}
                  className="mx-auto max-h-[70vh] w-full object-contain"
                />
              ) : (
                <div className="flex aspect-square items-center justify-center px-6 text-center text-sm text-white/55">
                  {labels.imageUnavailableLabel}
                </div>
              )}
            </div>
          ) : (
            <PublicCommercialVideo
              streamPath={preview.streamPath ?? ""}
              posterUrl={preview.posterUrl}
              title={preview.title}
              labels={{
                loadingLabel: labels.loadingLabel,
                streamErrorLabel: labels.streamErrorLabel,
                unmuteLabel: labels.unmuteLabel,
                playLabel: labels.playLabel,
              }}
            />
          )}
        </section>

        <section className="mt-6 space-y-5 text-center md:mt-8">
          <p className="text-sm leading-relaxed text-white/70 md:text-base">
            {isAdvertisingImage
              ? labels.imageTransformationLine
              : labels.transformationLine}
          </p>
          <PublicCommercialCta
            label={labels.ctaLabel}
            href={labels.ctaHref}
            shareSlug={preview.shareSlug}
          />
        </section>

        <div className="mt-10">
          <section
            aria-label={
              isAdvertisingImage ? labels.imageLabel : labels.commercialLabel
            }
          >
            <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-white/40">
              {isAdvertisingImage ? labels.imageLabel : labels.commercialLabel}
            </h2>
            <p className="text-sm leading-relaxed text-white/60">
              {preview.title}
            </p>
          </section>
        </div>

        <PublicCommercialFooter
          brand={labels.footerBrand}
          tagline={labels.footerTagline}
          locale={locale}
        />
      </div>
    </main>
  );
}
