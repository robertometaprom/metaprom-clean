import Image from "next/image";
import {
  GTM5_FEATURED_IMAGE_CHANNEL_IDS,
  GTM5_IMAGE_CHANNEL_IDS,
} from "@/lib/gtm5";
import type { LandingContent, Locale } from "@/lib/i18n";
import { IMAGE_CHANNEL_MARKS } from "@/lib/platform-marks";
import PlatformMark from "@/components/landing/PlatformMark";

const PRODUCT_TRANSFORMATION = {
  es: {
    src: "/ecommerce/product-before-after.png",
    alt: "Transformación de una foto casual de producto en una imagen profesional lista para marketplaces y tiendas en línea.",
  },
  en: {
    src: "/ecommerce/product-before-after-en.png",
    alt: "Transformation of a casual product photo into a professional image ready for marketplaces and online stores.",
  },
} as const;
const PRODUCT_TRANSFORMATION_WIDTH = 1536;
const PRODUCT_TRANSFORMATION_HEIGHT = 1024;

type ImageUseCasesProps = {
  copy: LandingContent["imageUseCases"];
  locale: Locale;
};

export default function ImageUseCases({ copy, locale }: ImageUseCasesProps) {
  const featuredIds = new Set<string>(GTM5_FEATURED_IMAGE_CHANNEL_IDS);
  const featured = GTM5_FEATURED_IMAGE_CHANNEL_IDS.map((id) => ({
    id,
    name: copy.channels[id],
    mark: IMAGE_CHANNEL_MARKS[id],
  }));
  const rest = GTM5_IMAGE_CHANNEL_IDS.filter((id) => !featuredIds.has(id)).map(
    (id) => ({
      id,
      name: copy.channels[id],
    }),
  );

  return (
    <section
      id="image-uses"
      className="border-t border-white/5"
      aria-labelledby="image-uses-heading"
    >
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-36">
        <h2
          id="image-uses-heading"
          className="max-w-3xl text-3xl font-bold tracking-tight text-[#F5F5F0] md:text-5xl"
        >
          {copy.headline}
        </h2>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-white/60 md:text-xl">
          {copy.copy}
        </p>

        <ul className="mt-12 grid gap-4 sm:grid-cols-3 md:mt-16">
          {featured.map((channel) => (
            <li
              key={channel.id}
              className="flex min-h-52 min-w-0 items-center justify-center rounded-sm border border-white/10 bg-white/[0.03] px-5 py-6 md:min-h-64 md:px-7 md:py-8"
            >
              {channel.mark ? (
                <PlatformMark mark={channel.mark} name={channel.name} />
              ) : (
                <p className="text-2xl font-semibold tracking-tight text-[#F5F5F0] md:text-3xl">
                  {channel.name}
                </p>
              )}
            </li>
          ))}
        </ul>

        <ul className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {rest.map((channel) => (
            <li
              key={channel.id}
              className="min-w-0 rounded-sm border border-white/10 bg-white/[0.02] px-4 py-4 md:px-5 md:py-5"
            >
              <p className="text-sm font-medium leading-snug text-[#F5F5F0] md:text-base">
                {channel.name}
              </p>
            </li>
          ))}
        </ul>

        <figure className="mx-auto mt-12 w-full min-w-0 max-w-full md:mt-16">
          <Image
            src={PRODUCT_TRANSFORMATION[locale].src}
            alt={PRODUCT_TRANSFORMATION[locale].alt}
            width={PRODUCT_TRANSFORMATION_WIDTH}
            height={PRODUCT_TRANSFORMATION_HEIGHT}
            sizes="(max-width: 768px) calc(100vw - 3rem), 1152px"
            unoptimized
            className="mx-auto h-auto w-full max-w-full object-contain"
            style={{
              width: "100%",
              height: "auto",
              objectFit: "contain",
              objectPosition: "center",
            }}
          />
        </figure>

        <div className="mt-12 max-w-xl space-y-2 md:mt-16">
          <p className="text-base leading-relaxed text-white/65 md:text-lg">
            {copy.supportingYou}
          </p>
          <p className="text-base leading-relaxed text-white/65 md:text-lg">
            {copy.supportingDirector}
          </p>
        </div>

        <p className="mt-8 text-sm text-white/40 md:text-base">
          {copy.publishNote}
        </p>
      </div>
    </section>
  );
}
