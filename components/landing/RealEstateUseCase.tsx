import Image from "next/image";
import type { LandingContent, Locale } from "@/lib/i18n";

const REAL_ESTATE_COMPOSITION = {
  es: "/real-estate/room-before-after.png",
  en: "/real-estate/room-before-after-en.png",
} as const;
const REAL_ESTATE_COMPOSITION_WIDTH = 1536;
const REAL_ESTATE_COMPOSITION_HEIGHT = 1024;

type RealEstateUseCaseProps = {
  copy: LandingContent["realEstate"];
  locale: Locale;
};

export default function RealEstateUseCase({
  copy,
  locale,
}: RealEstateUseCaseProps) {
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

        <figure className="mx-auto mt-12 w-full min-w-0 max-w-full md:mt-16">
          <Image
            src={REAL_ESTATE_COMPOSITION[locale]}
            alt={`${copy.beforeAlt}. ${copy.afterAlt}`}
            width={REAL_ESTATE_COMPOSITION_WIDTH}
            height={REAL_ESTATE_COMPOSITION_HEIGHT}
            sizes="(max-width: 768px) calc(100vw - 3rem), 1152px"
            className="mx-auto h-auto w-full max-w-full object-contain"
            style={{
              width: "100%",
              height: "auto",
              objectFit: "contain",
              objectPosition: "center",
            }}
          />
        </figure>

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
