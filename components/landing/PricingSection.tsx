import Link from "next/link";
import type { LandingContent } from "@/lib/i18n";

type PricingSectionProps = {
  headline: string;
  note: string;
  products: LandingContent["pricing"]["products"];
  ctaHref: string;
  ctaLabel: string;
};

export default function PricingSection({
  headline,
  note,
  products,
  ctaHref,
  ctaLabel,
}: PricingSectionProps) {
  return (
    <section id="pricing" className="border-t border-white/5">
      <div className="mx-auto max-w-6xl px-6 py-32 md:py-40">
        <h2 className="text-3xl font-bold tracking-tight text-[#F5F5F0] md:text-5xl">
          {headline}
        </h2>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/55">
          {note}
        </p>

        <div className="mt-20 grid gap-6 md:grid-cols-3 md:gap-8">
          {products.map((product) => (
            <article
              key={product.id}
              className="flex flex-col rounded-sm border border-white/10 bg-white/[0.02] p-8 md:p-10"
            >
              <h3 className="text-xl font-semibold text-[#F5F5F0] md:text-2xl">
                {product.name}
              </h3>
              <p className="mt-4 flex-1 text-base leading-relaxed text-white/55">
                {product.description}
              </p>
              <p className="mt-10 text-3xl font-bold tracking-tight text-[#F5F5F0]">
                {product.priceFormatted}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-20 flex justify-center">
          <Link
            href={ctaHref}
            className="inline-flex items-center justify-center rounded-full bg-[#F5F5F0] px-10 py-5 text-base font-medium text-black transition hover:bg-white md:text-lg"
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
