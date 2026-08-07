import PackagePurchaseButton from "@/components/pricing/PackagePurchaseButton";
import type { PackagePurchasability, PricingPackage } from "@/lib/pricing";
import { formatPriceMxn, PRICING_PAGE_COPY } from "@/lib/pricing";

export type PackageCardView = {
  package: PricingPackage;
  purchasability: PackagePurchasability;
  displayPriceFormatted: string;
  unitPriceFormatted: string;
  savingsAmountFormatted: string | null;
};

type PackageCardProps = {
  view: PackageCardView;
};

function resolveCtaLabel(state: PackagePurchasability["ctaState"]): string {
  switch (state) {
    case "purchase":
      return PRICING_PAGE_COPY.ctaPurchase;
    case "coming_soon":
      return PRICING_PAGE_COPY.ctaComingSoon;
    case "activate_payments":
    default:
      return PRICING_PAGE_COPY.ctaUnavailable;
  }
}

export default function PackageCard({ view }: PackageCardProps) {
  const { package: pkg, purchasability } = view;
  const highlighted = Boolean(pkg.badge);
  const ctaLabel = resolveCtaLabel(purchasability.ctaState);
  const enabled = purchasability.purchasable;
  const hasSavings = Boolean(pkg.savingsLabel && view.savingsAmountFormatted);

  return (
    <article
      className={`relative flex h-full flex-col rounded-sm border p-6 md:p-8 ${
        highlighted
          ? "border-white/25 bg-white/[0.045]"
          : "border-white/10 bg-white/[0.02]"
      }`}
    >
      {pkg.badge ? (
        <p className="mb-5 text-[11px] font-semibold tracking-[0.16em] text-[#F5F5F0]/75">
          {pkg.badge.label}
        </p>
      ) : (
        <div className="mb-5 h-[17px]" aria-hidden />
      )}

      <h3 className="text-2xl font-semibold tracking-tight text-[#F5F5F0]">
        {pkg.name}
      </h3>

      <p className="mt-8 text-4xl font-bold tracking-tight text-[#F5F5F0]">
        {view.displayPriceFormatted}
      </p>

      <p className="mt-2 text-sm text-white/50">
        {view.unitPriceFormatted}{" "}
        <span className="text-white/35">{PRICING_PAGE_COPY.unitLabel}</span>
      </p>

      {hasSavings ? (
        <div className="mt-3 space-y-1">
          <p className="text-sm font-medium text-[#F5F5F0]/80">
            {PRICING_PAGE_COPY.savingsLabel} {pkg.savingsLabel}
          </p>
          <p className="text-sm text-white/45">
            {view.savingsAmountFormatted}{" "}
            {PRICING_PAGE_COPY.savingsVsIndividual}
          </p>
        </div>
      ) : (
        <div className="mt-3 h-11" aria-hidden />
      )}

      <ul className="mt-8 flex-1 space-y-2.5 text-sm leading-relaxed text-white/60">
        {pkg.includedFeatures.map((feature) => (
          <li key={feature} className="flex gap-2.5">
            <span className="shrink-0 text-[#F5F5F0]/70" aria-hidden>
              ✔
            </span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <PackagePurchaseButton
        productKey={pkg.id}
        label={ctaLabel}
        enabled={enabled}
      />
    </article>
  );
}

export function buildPackageCardView(
  pkg: PricingPackage,
  purchasability: PackagePurchasability,
  locale: "en" | "es" = "es",
): PackageCardView {
  return {
    package: pkg,
    purchasability,
    displayPriceFormatted: formatPriceMxn(pkg.displayPrice, locale),
    unitPriceFormatted: formatPriceMxn(pkg.unitPrice, locale),
    savingsAmountFormatted:
      pkg.savingsAmount == null
        ? null
        : formatPriceMxn(pkg.savingsAmount, locale),
  };
}
