import type { PublicPreview } from "@/lib/preview/types";
import type { PublicCommercialContent } from "@/lib/public-commercial/content";
import PublicCommercialCta from "@/components/public/PublicCommercialCta";
import PublicCommercialFooter from "@/components/public/PublicCommercialFooter";
import PublicCommercialVideo from "@/components/public/PublicCommercialVideo";
import PublicOriginalPhoto from "@/components/public/PublicOriginalPhoto";

type PublicCommercialPageProps = {
  preview: PublicPreview;
  labels: PublicCommercialContent;
};

export default function PublicCommercialPage({
  preview,
  labels,
}: PublicCommercialPageProps) {
  return (
    <main className="min-h-screen bg-black text-[#F5F5F0]">
      <div className="mx-auto w-full max-w-lg px-4 py-6 md:max-w-2xl md:py-10">
        <section aria-label={labels.commercialLabel}>
          <PublicCommercialVideo
            streamPath={preview.streamPath}
            posterUrl={preview.posterUrl}
            title={preview.title}
            labels={{
              loadingLabel: labels.loadingLabel,
              streamErrorLabel: labels.streamErrorLabel,
              unmuteLabel: labels.unmuteLabel,
              playLabel: labels.playLabel,
            }}
          />
        </section>

        <section className="mt-6 space-y-5 text-center md:mt-8">
          <p className="text-sm leading-relaxed text-white/70 md:text-base">
            {labels.transformationLine}
          </p>
          <PublicCommercialCta label={labels.ctaLabel} href={labels.ctaHref} />
        </section>

        <div className="mt-10 space-y-8">
          <PublicOriginalPhoto
            src={preview.originalPhotoUrl}
            alt={labels.originalPhotoLabel}
            label={labels.originalPhotoLabel}
          />

          <section aria-label={labels.commercialLabel}>
            <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-white/40">
              {labels.commercialLabel}
            </h2>
            <p className="text-sm leading-relaxed text-white/60">{preview.title}</p>
          </section>
        </div>

        <PublicCommercialFooter
          brand={labels.footerBrand}
          tagline={labels.footerTagline}
        />
      </div>
    </main>
  );
}
