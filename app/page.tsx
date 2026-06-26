import Navbar from "@/components/Navbar";
import CommercialGallery from "@/components/landing/CommercialGallery";
import CreationPaths from "@/components/landing/CreationPaths";
import FinalCTA from "@/components/landing/FinalCTA";
import HeroSection from "@/components/landing/HeroSection";
import PrinciplesSection from "@/components/landing/PrinciplesSection";
import TransformationStory from "@/components/landing/TransformationStory";
import {
  CREATION_PATHS,
  LANDING_COPY,
  PORTFOLIO_ITEMS,
  PRINCIPLES,
} from "@/lib/portfolio";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="bg-black text-[#F5F5F0]">
        <HeroSection copy={LANDING_COPY.hero} videos={PORTFOLIO_ITEMS} />

        <section id="transformations">
          {PORTFOLIO_ITEMS.map((item) => (
            <TransformationStory key={item.id} item={item} />
          ))}
        </section>

        <CreationPaths
          headline={LANDING_COPY.creationPaths.headline}
          paths={CREATION_PATHS}
        />

        <PrinciplesSection
          sentence={LANDING_COPY.noAi.sentence}
          principles={PRINCIPLES}
        />

        <CommercialGallery items={PORTFOLIO_ITEMS} />

        <FinalCTA copy={LANDING_COPY.finalCta} />
      </main>
    </>
  );
}
