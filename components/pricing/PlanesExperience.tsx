import Link from "next/link";
import PackageCard, {
  buildPackageCardView,
  type PackageCardView,
} from "@/components/pricing/PackageCard";
import PricingFaq from "@/components/pricing/PricingFaq";
import MetapromLogo from "@/components/studio/MetapromLogo";
import type { PricingCategoryMeta } from "@/lib/pricing";
import { PRICING_FAQ, PRICING_PAGE_COPY } from "@/lib/pricing";
import LegalLinks from "@/components/legal/LegalLinks";

type PlanesExperienceProps = {
  brand: string;
  navPlanesLabel: string;
  categories: Array<{
    meta: PricingCategoryMeta;
    packages: PackageCardView[];
  }>;
};

export default function PlanesExperience({
  brand,
  navPlanesLabel,
  categories,
}: PlanesExperienceProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-[#F5F5F0]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(245,245,240,0.08),_transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(245,245,240,0.04),_transparent_50%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,0.55)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.55)_1px,transparent_1px)] [background-size:72px_72px]"
      />

      <header className="relative z-10 border-b border-white/5">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-6 sm:py-6">
          <Link href="/" aria-label={brand}>
            <MetapromLogo variant="dark" height={32} priority />
          </Link>
          <nav className="flex items-center gap-4 sm:gap-6">
            <span className="text-sm font-medium tracking-wide text-[#F5F5F0]/80">
              {navPlanesLabel}
            </span>
            <Link
              href="/studio"
              className="rounded-full bg-[#F5F5F0] px-5 py-2.5 text-sm font-medium text-black transition hover:bg-white"
            >
              Crear
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-5 py-14 sm:px-6 md:py-24">
        <section className="max-w-3xl">
          <p className="text-sm font-semibold tracking-[0.22em] text-white/45">
            {brand.toUpperCase()}
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#F5F5F0] md:text-6xl">
            {PRICING_PAGE_COPY.header}
          </h1>
          <div className="mt-6 space-y-1 text-base leading-relaxed text-white/55 sm:text-lg md:text-xl">
            {PRICING_PAGE_COPY.subtitleLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <p className="mt-8 text-base font-medium text-[#F5F5F0]/80 md:text-lg">
            {PRICING_PAGE_COPY.philosophy}
          </p>
        </section>

        <div className="mt-16 space-y-16 md:mt-28 md:space-y-28">
          {categories.map(({ meta, packages }) => (
            <section key={meta.id} aria-labelledby={`pricing-${meta.id}`}>
              <div className="max-w-3xl">
                <h2
                  id={`pricing-${meta.id}`}
                  className="text-2xl font-bold tracking-tight text-[#F5F5F0] md:text-4xl"
                >
                  {meta.title}
                </h2>
                <p className="mt-4 text-base leading-relaxed text-white/50 md:text-lg">
                  {meta.subtitle}
                </p>
              </div>

              <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4 xl:gap-6">
                {packages.map((view) => (
                  <PackageCard key={view.package.id} view={view} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-14 text-sm text-white/40 md:mt-20">
          {PRICING_PAGE_COPY.neverExpireNote}
        </p>

        <section
          aria-labelledby="payment-methods"
          className="mt-14 border-t border-white/10 pt-10 md:mt-20"
        >
          <h2
            id="payment-methods"
            className="text-xl font-semibold tracking-tight text-[#F5F5F0] md:text-2xl"
          >
            {PRICING_PAGE_COPY.paymentMethods.title}
          </h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PRICING_PAGE_COPY.paymentMethods.methods.map((method) => (
              <li
                key={method}
                className="border border-white/10 bg-white/[0.02] px-4 py-3.5 text-sm text-white/65"
              >
                {method}
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-14 md:mt-20">
          <PricingFaq title={PRICING_FAQ.title} items={PRICING_FAQ.items} />
        </div>

        <section
          aria-labelledby="footer-cta"
          className="mt-16 border-t border-white/10 pt-12 md:mt-24 md:pt-16"
        >
          <div className="max-w-2xl">
            <h2
              id="footer-cta"
              className="text-2xl font-bold tracking-tight text-[#F5F5F0] md:text-3xl"
            >
              {PRICING_PAGE_COPY.footerCta.title}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-white/55 md:text-lg">
              {PRICING_PAGE_COPY.footerCta.body}
            </p>
            <Link
              href={PRICING_PAGE_COPY.footerCta.ctaHref}
              className="mt-8 inline-flex items-center justify-center rounded-full bg-[#F5F5F0] px-7 py-3.5 text-sm font-medium text-black transition hover:bg-white"
            >
              {PRICING_PAGE_COPY.footerCta.ctaLabel}
            </Link>
          </div>
        </section>
      </main>
      <footer className="relative z-10 border-t border-white/5">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6">
          <LegalLinks className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/40" />
        </div>
      </footer>
    </div>
  );
}

export { buildPackageCardView };
