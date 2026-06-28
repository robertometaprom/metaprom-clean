import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import CinemaStage from "@/components/landing/CinemaStage";
import Footer from "@/components/landing/Footer";
import PricingSection from "@/components/landing/PricingSection";
import SimpleSteps from "@/components/landing/SimpleSteps";
import TheReveal from "@/components/landing/TheReveal";
import { getLandingContent } from "@/lib/i18n";

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
      <Navbar labels={content.nav} />
      <main className="bg-black text-[#F5F5F0]">
        <CinemaStage
          copy={content.cinema}
          price={content.priceConfidence}
          videos={content.showcase}
        />

        <TheReveal item={content.featured} labels={content.reveal} />

        <ShowcaseGrid
          headline={content.showcaseSection.headline}
          labels={content.showcaseLabels}
          items={content.showcase}
        />

        <SimpleSteps steps={content.steps} />

        <Testimonials
          headline={content.testimonials.headline}
          items={content.testimonials.items}
        />

        <PricingSection
          headline={content.pricing.headline}
          note={content.pricing.note}
          products={content.pricing.products}
          ctaHref={content.cinema.primaryCtaHref}
          ctaLabel={content.cinema.primaryCta}
        />

        <Footer labels={content.footer} brand={content.nav.brand} />
      </main>
    </>
  );
}
