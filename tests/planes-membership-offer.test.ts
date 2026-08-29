/**
 * /planes membership-first UI offer — copy and checkout-safety.
 *
 * Run: npx tsx --test tests/planes-membership-offer.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  getPlanesBillingOption,
  getPlanesMembershipOrder,
  getPlanesOfferCopy,
  getPricingPackageById,
  PLANES_DEFAULT_BILLING_CYCLE,
  PLANES_ONE_OFF_PRODUCT_KEY,
  PRICING_PACKAGES,
  PRICING_PAGE_COPY,
  getPricingFaq,
  type PlanesBillingOption,
} from "../lib/pricing/index.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

const CONFLICTING_COPY = [
  /Sin suscripciones/,
  /No planes mensuales/,
  /Sin vencimientos/,
  /Los paquetes comprados nunca vencen/,
  /¿No sabes qué paquete elegir/,
  /Do packages expire/,
  /¿Los paquetes vencen/,
  /No subscription required/,
];

function assertBilling(
  option: PlanesBillingOption,
  expected: {
    cycle: PlanesBillingOption["cycle"];
    priceLabel: string;
    periodLabel: string;
    commercialsLabel: string;
    savingsLabel: string | null;
  },
) {
  assert.equal(option.cycle, expected.cycle);
  assert.equal(option.priceLabel, expected.priceLabel);
  assert.equal(option.periodLabel, expected.periodLabel);
  assert.equal(option.commercialsLabel, expected.commercialsLabel);
  assert.equal(option.savingsLabel, expected.savingsLabel);
}

test("membership offer has Golden and Premium with monthly/annual modalities in ES and EN", () => {
  const es = getPlanesOfferCopy("es");
  const en = getPlanesOfferCopy("en");

  assert.deepEqual(Object.keys(es.memberships).sort(), ["golden", "premium"]);
  assert.equal("monthly" in es.memberships, false);
  assert.equal(PLANES_DEFAULT_BILLING_CYCLE, "annual");

  assert.equal(es.memberships.golden.name, "GOLDEN");
  assert.equal(es.memberships.golden.badge, null);
  assert.equal(es.memberships.golden.recommended, false);
  assert.deepEqual(es.memberships.golden.coreBenefits, [
    "Imágenes publicitarias ilimitadas",
    "Director Creativo incluido",
    "Video HD listo para publicar",
    "Uso comercial",
    "Garantía de satisfacción",
  ]);
  assert.match(
    es.memberships.golden.accumulationNote,
    /Tus comerciales no utilizados se acumulan mientras mantengas activa tu membresía/,
  );
  assertBilling(es.memberships.golden.monthly, {
    cycle: "monthly",
    priceLabel: "$350 MXN",
    periodLabel: "/ mes",
    commercialsLabel: "8 comerciales",
    savingsLabel: null,
  });
  assertBilling(es.memberships.golden.annual, {
    cycle: "annual",
    priceLabel: "$2,990 MXN",
    periodLabel: "/ año",
    commercialsLabel: "100 comerciales",
    savingsLabel: "Ahorra $1,210 al año",
  });

  assert.equal(es.memberships.premium.name, "PREMIUM");
  assert.equal(es.memberships.premium.badge, "MEJOR VALOR");
  assert.equal(es.memberships.premium.recommended, true);
  assert.deepEqual(es.memberships.premium.coreBenefits, [
    "Imágenes publicitarias ilimitadas",
    "Director Creativo incluido",
    "Video HD listo para publicar",
    "Uso comercial",
    "Garantía de satisfacción",
  ]);
  assert.match(
    es.memberships.premium.accumulationNote,
    /Tus comerciales no utilizados se acumulan mientras mantengas activa tu membresía/,
  );
  assertBilling(es.memberships.premium.monthly, {
    cycle: "monthly",
    priceLabel: "$600 MXN",
    periodLabel: "/ mes",
    commercialsLabel: "15 comerciales",
    savingsLabel: null,
  });
  assertBilling(es.memberships.premium.annual, {
    cycle: "annual",
    priceLabel: "$4,990 MXN",
    periodLabel: "/ año",
    commercialsLabel: "200 comerciales",
    savingsLabel: "Ahorra $2,210 al año",
  });

  assert.equal(es.billing.monthlyLabel, "Mensual");
  assert.equal(es.billing.annualLabel, "Anual");
  assert.equal(es.oneOff.question, "¿Sólo necesitas un comercial?");
  assert.equal(es.oneOff.name, "1 comercial");
  assert.equal(es.oneOff.priceLabel, "$180 MXN");

  assert.equal(en.memberships.premium.badge, "BEST VALUE");
  assert.equal(en.memberships.premium.recommended, true);
  assertBilling(en.memberships.golden.monthly, {
    cycle: "monthly",
    priceLabel: "$350 MXN",
    periodLabel: "/ month",
    commercialsLabel: "8 commercials",
    savingsLabel: null,
  });
  assertBilling(en.memberships.golden.annual, {
    cycle: "annual",
    priceLabel: "$2,990 MXN",
    periodLabel: "/ year",
    commercialsLabel: "100 commercials",
    savingsLabel: "Save $1,210 a year",
  });
  assertBilling(en.memberships.premium.monthly, {
    cycle: "monthly",
    priceLabel: "$600 MXN",
    periodLabel: "/ month",
    commercialsLabel: "15 commercials",
    savingsLabel: null,
  });
  assertBilling(en.memberships.premium.annual, {
    cycle: "annual",
    priceLabel: "$4,990 MXN",
    periodLabel: "/ year",
    commercialsLabel: "200 commercials",
    savingsLabel: "Save $2,210 a year",
  });
  assert.equal(en.billing.monthlyLabel, "Monthly");
  assert.equal(en.billing.annualLabel, "Annual");
  assert.equal(en.oneOff.question, "Only need one commercial?");
  assert.equal(en.oneOff.priceLabel, "$180 MXN");
  assert.match(
    en.memberships.premium.accumulationNote,
    /Unused commercials accumulate/,
  );

  const order = getPlanesMembershipOrder(es).map((plan) => plan.id);
  assert.deepEqual(order, ["golden", "premium"]);
  assert.equal(
    getPlanesBillingOption(es.memberships.golden).cycle,
    "annual",
  );
});

test("/planes UI renders two membership cards with a billing selector and keeps $180 checkout mapping", () => {
  const page = readRepo("app/planes/page.tsx");
  const experience = readRepo("components/pricing/PlanesExperience.tsx");
  const card = readRepo("components/pricing/MembershipCard.tsx");
  const offer = readRepo("lib/pricing/planes-offer.ts");

  assert.match(page, /getPlanesOfferCopy/);
  assert.match(page, /PLANES_ONE_OFF_PRODUCT_KEY/);
  assert.match(page, /getPackagePurchasability/);
  assert.doesNotMatch(page, /getActivePricingCategories/);
  assert.doesNotMatch(page, /getPackagesByCategory/);
  assert.doesNotMatch(page, /getAllPackagePurchasability/);

  assert.match(experience, /<MembershipCard/);
  assert.match(experience, /data-plan="one-off"/);
  assert.match(experience, /productKey=\{PLANES_ONE_OFF_PRODUCT_KEY\}/);
  assert.match(experience, /PackagePurchaseButton/);
  assert.doesNotMatch(experience, /copy\.memberships\.monthly/);
  assert.doesNotMatch(experience, /monthly-membership/);
  assert.doesNotMatch(experience, /PackageCard/);
  assert.doesNotMatch(experience, /categories\.map/);

  assert.match(card, /data-plan=\{plan\.id\}/);
  assert.match(card, /data-billing-cycle=\{cycle\}/);
  assert.match(card, /data-membership-cta="non-transactional"/);
  assert.match(card, /PLANES_DEFAULT_BILLING_CYCLE/);
  assert.match(card, /useState<PlanesBillingCycle>/);
  assert.match(card, /aria-pressed=\{selected\}/);

  assert.equal(PLANES_ONE_OFF_PRODUCT_KEY, "commercial_1");
  assert.equal(getPricingPackageById("commercial_1")?.displayPrice, 180);
  assert.equal(PRICING_PACKAGES.length, 8);

  assert.match(offer, /PLANES_ONE_OFF_PRODUCT_KEY = "commercial_1"/);
  assert.doesNotMatch(offer, /STRIPE_PRICE_ID/);
  assert.doesNotMatch(offer, /price_/);
  assert.doesNotMatch(offer, /createCheckout|checkout-session|webhook/);
});

test("membership CTAs are non-transactional and do not reuse Stripe prices", () => {
  const card = readRepo("components/pricing/MembershipCard.tsx");
  const offer = readRepo("lib/pricing/planes-offer.ts");
  const page = readRepo("app/planes/page.tsx");
  const experience = readRepo("components/pricing/PlanesExperience.tsx");

  assert.match(card, /disabled/);
  assert.match(card, /aria-disabled="true"/);
  assert.doesNotMatch(card, /PackagePurchaseButton/);
  assert.doesNotMatch(card, /productKey/);
  assert.doesNotMatch(card, /\/api\/payments\/checkout/);
  assert.doesNotMatch(card, /STRIPE_PRICE_ID_COMMERCIAL/);

  assert.doesNotMatch(offer, /STRIPE_PRICE_ID_COMMERCIAL_5|COMMERCIAL_10|COMMERCIAL_20/);
  assert.doesNotMatch(page, /STRIPE_PRICE_ID/);
  assert.match(page, /commercial_1 package for \/planes one-off checkout/);
  assert.match(experience, /productKey=\{PLANES_ONE_OFF_PRODUCT_KEY\}/);
});

test("old package-grid and anti-membership copy is gone from /planes surfaces", () => {
  const surfaces = [
    readRepo("app/planes/page.tsx"),
    readRepo("components/pricing/PlanesExperience.tsx"),
    readRepo("components/pricing/MembershipCard.tsx"),
    readRepo("lib/pricing/planes-offer.ts"),
    JSON.stringify(PRICING_PAGE_COPY),
    JSON.stringify(getPricingFaq("es")),
    JSON.stringify(getPricingFaq("en")),
    JSON.stringify(getPlanesOfferCopy("es")),
    JSON.stringify(getPlanesOfferCopy("en")),
  ].join("\n");

  for (const pattern of CONFLICTING_COPY) {
    assert.doesNotMatch(surfaces, pattern, String(pattern));
  }

  assert.doesNotMatch(surfaces, /xl:grid-cols-4/);
  assert.doesNotMatch(readRepo("components/pricing/PlanesExperience.tsx"), /COMERCIALES/);
  assert.doesNotMatch(readRepo("components/pricing/PlanesExperience.tsx"), /IMÁGENES PUBLICITARIAS/);
});

test("English membership copy has no Spanish leftovers", () => {
  const en = JSON.stringify(getPlanesOfferCopy("en"));
  assert.doesNotMatch(en, /[¿¡]|membresía|comerciales|ilimitadas|\/ año|\/ mes/);
  assert.match(en, /Choose Golden or Premium/);
  assert.match(en, /Choose monthly or annual/);
  assert.match(en, /Talk to Director/);
  assert.match(en, /Save \$1,210 a year/);
  assert.match(en, /Save \$2,210 a year/);
  assert.match(en, /BEST VALUE/);
});
