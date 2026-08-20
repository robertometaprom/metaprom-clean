import type { LandingContent } from "@/lib/i18n";
import PortfolioImage from "@/components/landing/PortfolioImage";

type RealEstateUseCaseProps = {
  copy: LandingContent["realEstate"];
};

export default function RealEstateUseCase({ copy }: RealEstateUseCaseProps) {
  return (
    <section
      id="real-estate"
      className="border-t border-white/5"
      aria-labelledby="real-estate-heading"
    >
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-36">
        <h2
          id="real-estate-heading"
          className="max-w-3xl text-3xl font-bold leading-[1.1] tracking-tight text-[#F5F5F0] md:text-5xl"
        >
          <span className="block">{copy.headlineBetter}</span>
          <span className="mt-2 block text-white/55">{copy.headlineSame}</span>
        </h2>

        <div className="mt-12 grid gap-4 md:mt-16 md:grid-cols-2 md:gap-6">
          <figure className="min-w-0 overflow-hidden rounded-sm border border-white/10 bg-white/[0.02]">
            <PortfolioImage
              src={copy.visual.beforeImage}
              alt={copy.beforeAlt}
              variant="before"
              aspectClassName="aspect-[4/5] md:aspect-[4/3]"
            />
            <figcaption className="px-5 py-4 text-xs uppercase tracking-[0.25em] text-white/40">
              {copy.headlineSame}
            </figcaption>
          </figure>
          <figure className="min-w-0 overflow-hidden rounded-sm border border-white/10 bg-white/[0.02]">
            <PortfolioImage
              src={copy.visual.premiumImage}
              alt={copy.afterAlt}
              variant="premium"
              aspectClassName="aspect-[4/5] md:aspect-[4/3]"
            />
            <figcaption className="px-5 py-4 text-xs uppercase tracking-[0.25em] text-[#E8B86D]/80">
              {copy.headlineBetter}
            </figcaption>
          </figure>
        </div>

        <p className="mt-10 max-w-3xl text-lg leading-relaxed text-white/60 md:mt-12 md:text-xl">
          {copy.intro}
        </p>
        <p className="mt-6 max-w-3xl text-base leading-relaxed text-white/55 md:text-lg">
          {copy.copy}
        </p>

        <div className="mt-10 max-w-xl space-y-2">
          <p className="text-base font-medium text-[#F5F5F0] md:text-lg">
            {copy.supportingImprove}
          </p>
          <p className="text-base text-white/55 md:text-lg">
            {copy.supportingInvent}
          </p>
        </div>
      </div>
    </section>
  );
}
