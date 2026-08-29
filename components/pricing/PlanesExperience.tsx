import Link from "next/link";
import MembershipCard from "@/components/pricing/MembershipCard";
import PackagePurchaseButton from "@/components/pricing/PackagePurchaseButton";
import PaymentMethods from "@/components/pricing/PaymentMethods";
import PricingFaq from "@/components/pricing/PricingFaq";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import MetapromLogo from "@/components/studio/MetapromLogo";
import LegalLinks from "@/components/legal/LegalLinks";
import PublicSiteLinks from "@/components/public/PublicSiteLinks";
import type { Locale, Messages } from "@/lib/i18n";
import type {
  MembershipProductId,
  MembershipPurchasability,
  PackagePurchasability,
} from "@/lib/pricing";
import {
  getPlanesMembershipOrder,
  getPricingFaq,
  PLANES_ONE_OFF_PRODUCT_KEY,
  type PlanesOfferCopy,
} from "@/lib/pricing";

type PlanesExperienceProps = {
  brand: string;
  navPlanesLabel: string;
  createLabel: string;
  locale: Locale;
  legal: Messages["legalNav"];
  showOxxoPay: boolean;
  copy: PlanesOfferCopy;
  oneOffPurchasability: PackagePurchasability;
  membershipPurchasability: Record<
    MembershipProductId,
    MembershipPurchasability
  >;
};

export default function PlanesExperience({
  brand,
  navPlanesLabel,
  createLabel,
  locale,
  legal,
  showOxxoPay,
  copy,
  oneOffPurchasability,
  membershipPurchasability,
}: PlanesExperienceProps) {
  const pricingFaq = getPricingFaq(locale);
  const memberships = getPlanesMembershipOrder(copy);
  const oneOffEnabled = oneOffPurchasability.purchasable;
  const oneOffCtaLabel = oneOffEnabled
    ? copy.oneOff.ctaPurchase
    : copy.oneOff.ctaUnavailable;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-black text-[#F5F5F0]">
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
          <nav className="flex items-center gap-3 sm:gap-6">
            <span className="hidden text-sm font-medium tracking-wide text-[#F5F5F0]/80 sm:inline">
              {navPlanesLabel}
            </span>
            <LocaleSwitcher locale={locale} />
            <Link
              href="/studio"
              className="rounded-full bg-[#F5F5F0] px-4 py-2 text-sm font-medium text-black transition hover:bg-white sm:px-5 sm:py-2.5"
            >
              {createLabel}
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
            {copy.header}
          </h1>
          <div className="mt-6 space-y-1 text-base leading-relaxed text-white/55 sm:text-lg md:text-xl">
            {copy.subtitleLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <p className="mt-8 text-base font-medium text-[#F5F5F0]/80 md:text-lg">
            {copy.philosophy}
          </p>
        </section>

        <section
          aria-labelledby="memberships"
          className="mt-16 md:mt-28"
        >
          <p className="text-sm font-semibold tracking-[0.18em] text-white/40">
            {copy.membershipEyebrow}
          </p>
          <h2 id="memberships" className="sr-only">
            {copy.membershipEyebrow}
          </h2>
          <div className="mt-8 grid gap-4 sm:mt-10 md:grid-cols-2 md:items-stretch md:gap-6">
            {memberships.map((plan) => (
              <MembershipCard
                key={plan.id}
                plan={plan}
                featured={plan.recommended}
                monthlyLabel={copy.billing.monthlyLabel}
                annualLabel={copy.billing.annualLabel}
                selectorAriaLabel={copy.billing.selectorAriaLabel}
                locale={locale}
                purchasability={membershipPurchasability}
              />
            ))}
          </div>
        </section>

        <section
          data-plan="one-off"
          aria-labelledby="one-off-commercial"
          className="mt-14 border-t border-white/10 pt-10 md:mt-20"
        >
          <h2
            id="one-off-commercial"
            className="text-lg font-medium tracking-tight text-white/55 md:text-xl"
          >
            {copy.oneOff.question}
          </h2>
          <div className="mt-6 max-w-md rounded-sm border border-white/8 bg-white/[0.015] p-5 md:p-6">
            <p className="text-base text-white/70">
              {copy.oneOff.name}
              <span className="text-white/35"> — </span>
              <span className="font-medium text-[#F5F5F0]/85">
                {copy.oneOff.priceLabel}
              </span>
            </p>
            <PackagePurchaseButton
              productKey={PLANES_ONE_OFF_PRODUCT_KEY}
              label={oneOffCtaLabel}
              enabled={oneOffEnabled}
              locale={locale}
            />
          </div>
        </section>

        <PaymentMethods
          showOxxoPay={showOxxoPay}
          title={copy.paymentMethods.title}
          stripeLabel={copy.paymentMethods.stripeLabel}
        />

        <div className="mt-14 md:mt-20">
          <PricingFaq title={pricingFaq.title} items={pricingFaq.items} />
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
              {copy.footerCta.title}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-white/55 md:text-lg">
              {copy.footerCta.body}
            </p>
            <Link
              href={copy.footerCta.ctaHref}
              className="mt-8 inline-flex items-center justify-center rounded-full bg-[#F5F5F0] px-7 py-3.5 text-sm font-medium text-black transition hover:bg-white"
            >
              {copy.footerCta.ctaLabel}
            </Link>
          </div>
        </section>
      </main>
      <footer className="relative z-10 border-t border-white/5">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6">
          <PublicSiteLinks
            locale={locale}
            keys={["studio", "examples", "about"]}
            className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-white/55"
          />
          <LegalLinks
            locale={locale}
            labels={legal}
            className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/40"
          />
        </div>
      </footer>
    </div>
  );
}
