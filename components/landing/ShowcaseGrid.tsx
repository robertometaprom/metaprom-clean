"use client";

import type { LandingContent } from "@/lib/i18n";
import PortfolioImage from "@/components/landing/PortfolioImage";
import CommercialVideo from "@/components/landing/CommercialVideo";

type ShowcaseGridProps = {
  headline?: string;
  labels: LandingContent["showcaseLabels"];
  items: LandingContent["showcase"];
};

function MediaLabel({ children }: { children: string }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.25em] text-white/35 md:text-xs">
      {children}
    </p>
  );
}

function ShowcaseCard({
  item,
  labels,
}: {
  item: LandingContent["showcase"][number];
  labels: LandingContent["showcaseLabels"];
}) {
  return (
    <article className="overflow-hidden rounded-sm border border-white/10 bg-white/[0.02]">
      <div className="border-b border-white/10 px-6 py-8 md:px-10 md:py-10">
        <p className="text-xs uppercase tracking-[0.25em] text-white/40">
          {item.description}
        </p>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[#F5F5F0] md:text-3xl">
          {item.title}
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-px bg-white/10">
        <div className="bg-black">
          <div className="px-4 pt-4 md:px-5 md:pt-5">
            <MediaLabel>{labels.before}</MediaLabel>
          </div>
          <div className="mt-3 overflow-hidden">
            <PortfolioImage
              src={item.beforeImage}
              alt={labels.before}
              variant="before"
              aspectClassName="aspect-[3/4]"
            />
          </div>
        </div>

        <div className="bg-black">
          <div className="px-4 pt-4 md:px-5 md:pt-5">
            <MediaLabel>{labels.premium}</MediaLabel>
          </div>
          <div className="mt-3 overflow-hidden">
            <PortfolioImage
              src={item.premiumImage}
              alt={labels.premium}
              variant="premium"
              aspectClassName="aspect-[3/4]"
            />
          </div>
        </div>

        <div className="bg-black">
          <div className="px-4 pt-4 md:px-5 md:pt-5">
            <MediaLabel>{labels.commercial}</MediaLabel>
          </div>
          <div className="mt-3 overflow-hidden">
            <CommercialVideo
              src={item.commercialVideo}
              poster={item.commercialPoster}
              muted
              loop
              playsInline
              preload="metadata"
              lazyLoad
              playInView
              className="aspect-[3/4] h-full w-full object-cover"
            />
          </div>
        </div>
      </div>
    </article>
  );
}

export default function ShowcaseGrid({
  headline,
  labels,
  items,
}: ShowcaseGridProps) {
  if (items.length === 0) return null;

  return (
    <section
      className={
        headline
          ? "mx-auto max-w-7xl px-6 py-32 md:py-40"
          : "mx-auto max-w-7xl px-6 pb-24 pt-10 md:pb-32 md:pt-14"
      }
    >
      {headline ? (
        <h2 className="max-w-3xl text-3xl font-bold tracking-tight text-[#F5F5F0] md:text-5xl">
          {headline}
        </h2>
      ) : null}

      <div className={headline ? "mt-20 grid gap-12 md:gap-16" : "grid gap-12 md:gap-16"}>
        {items.map((item) => (
          <ShowcaseCard key={item.id} labels={labels} item={item} />
        ))}
      </div>
    </section>
  );
}
