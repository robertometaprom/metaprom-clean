import type { Metadata } from "next";
import dynamic from "next/dynamic";
import LandingVisitBeacon from "@/components/analytics/LandingVisitBeacon";
import Navbar from "@/components/Navbar";
import AiVsMetaprom from "@/components/landing/AiVsMetaprom";
import CinemaStage from "@/components/landing/CinemaStage";
import Footer from "@/components/landing/Footer";
import ImageUseCases from "@/components/landing/ImageUseCases";
import LandingFaq from "@/components/landing/LandingFaq";
import PricingSection from "@/components/landing/PricingSection";
import RealEstateUseCase from "@/components/landing/RealEstateUseCase";
import SimpleSteps from "@/components/landing/SimpleSteps";
import TheReveal from "@/components/landing/TheReveal";
import VideoUseCases from "@/components/landing/VideoUseCases";
import WhatIsMetaprom from "@/components/landing/WhatIsMetaprom";
import { getLandingContent } from "@/lib/i18n";
import { publicIndexMetadata } from "@/lib/seo/metadata";
import { HOMEPAGE_DESCRIPTION, HOMEPAGE_TITLE } from "@/lib/seo/site";

export const metadata: Metadata = publicIndexMetadata({
  title: HOMEPAGE_TITLE,
  description: HOMEPAGE_DESCRIPTION,
  path: "/",
});

const ShowcaseGrid = dynamic(
  () => import("@/components/landing/ShowcaseGrid"),
  { loading: () => null },
);

const Testimonials = dynamic(
  () => import("@/components/landing/Testimonials"),
  { loading: () => null },
);

export default async function Home() {
  const content = await getLandingContent();

  return (
    <>
      <LandingVisitBeacon />
      <Navbar labels={content.nav} locale={content.locale} />
      <main className="overflow-x-hidden bg-black text-[#F5F5F0]">
        <CinemaStage
          copy={content.cinema}
          videos={content.showcase}
        />

        <WhatIsMetaprom copy={content.whatIs} />

        <TheReveal item={content.featured} labels={content.reveal} />

        <ShowcaseGrid
          headline={content.showcaseSection.headline}
          labels={content.showcaseLabels}
          items={content.showcase}
        />

        <SimpleSteps productFlow={content.productFlow} />

        <ImageUseCases
          copy={content.imageUseCases}
          locale={content.locale}
        />

        <RealEstateUseCase copy={content.realEstate} locale={content.locale} />

        <VideoUseCases copy={content.videoUseCases} />

        <AiVsMetaprom copy={content.aiVs} />

        <Testimonials
          headline={content.testimonials.headline}
          items={content.testimonials.items}
        />

        <LandingFaq copy={content.faq} />

        <PricingSection
          headline={content.pricing.headline}
          note={content.pricing.note}
          products={content.pricing.products}
          ctaHref={content.pricing.ctaHref}
          ctaLabel={content.pricing.cta}
        />

        <Footer
          labels={content.footer}
          brand={content.nav.brand}
          locale={content.locale}
          legal={content.legalNav}
        />
      </main>
    </>
  );
}
