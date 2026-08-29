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
  getPlanesMembershipOrder,
  getPlanesOfferCopy,
  getPricingPackageById,
  PLANES_ONE_OFF_PRODUCT_KEY,
  PRICING_PACKAGES,
  PRICING_PAGE_COPY,
  getPricingFaq,
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

test("membership offer has Premium, Golden, monthly, and $180 one-off in ES and EN", () => {
  const es = getPlanesOfferCopy("es");
  const en = getPlanesOfferCopy("en");

  assert.equal(es.memberships.premium.name, "PREMIUM");
  assert.equal(es.memberships.premium.priceLabel, "$4,990 MXN");
  assert.equal(es.memberships.premium.periodLabel, "/ año");
  assert.equal(es.memberships.premium.badge, "MEJOR VALOR");
  assert.equal(es.memberships.premium.recommended, true);
  assert.deepEqual(es.memberships.premium.features, [
    "200 comerciales",
    "Imágenes publicitarias ilimitadas",
    "Director Creativo incluido",
    "Video HD listo para publicar",
    "Uso comercial",
    "Garantía de satisfacción",
  ]);
  assert.match(
    es.memberships.premium.accumulationNote ?? "",
    /Tus comerciales no utilizados se acumulan mientras mantengas activa tu membresía/,
  );

  assert.equal(es.memberships.golden.name, "GOLDEN");
  assert.equal(es.memberships.golden.priceLabel, "$2,990 MXN");
  assert.equal(es.memberships.golden.periodLabel, "/ año");
  assert.equal(es.memberships.golden.badge, null);
  assert.deepEqual(es.memberships.golden.features, [
    "100 comerciales",
    "Imágenes publicitarias ilimitadas",
    "Director Creativo incluido",
    "Video HD listo para publicar",
    "Uso comercial",
    "Garantía de satisfacción",
  ]);
  assert.match(
    es.memberships.golden.accumulationNote ?? "",
    /Tus comerciales no utilizados se acumulan mientras mantengas activa tu membresía/,
  );

  assert.equal(es.memberships.monthly.priceLabel, "$600 MXN");
  assert.equal(es.memberships.monthly.periodLabel, "/ mes");
  assert.deepEqual(es.memberships.monthly.features, [
    "15 comerciales",
    "Imágenes publicitarias ilimitadas",
    "Director Creativo incluido",
  ]);
  assert.equal(es.memberships.monthly.accumulationNote, null);

  assert.equal(es.oneOff.question, "¿Sólo necesitas un comercial?");
  assert.equal(es.oneOff.name, "1 comercial");
  assert.equal(es.oneOff.priceLabel, "$180 MXN");

  assert.equal(en.memberships.premium.badge, "BEST VALUE");
  assert.equal(en.memberships.premium.priceLabel, "$4,990 MXN");
  assert.equal(en.memberships.premium.periodLabel, "/ year");
  assert.equal(en.memberships.golden.priceLabel, "$2,990 MXN");
  assert.equal(en.memberships.golden.periodLabel, "/ year");
  assert.equal(en.memberships.monthly.priceLabel, "$600 MXN");
  assert.equal(en.memberships.monthly.periodLabel, "/ month");
  assert.deepEqual(en.memberships.monthly.features, [
    "15 commercials",
    "Unlimited advertising images",
    "Creative Director included",
  ]);
  assert.equal(en.oneOff.question, "Only need one commercial?");
  assert.equal(en.oneOff.priceLabel, "$180 MXN");
  assert.match(
    en.memberships.premium.accumulationNote ?? "",
    /Unused commercials accumulate/,
  );

  const order = getPlanesMembershipOrder(es).map((plan) => plan.id);
  assert.deepEqual(order, ["premium", "golden"]);
});

test("/planes UI renders membership-first hierarchy and keeps $180 checkout mapping", () => {
  const page = readRepo("app/planes/page.tsx");
  const experience = readRepo("components/pricing/PlanesExperience.tsx");
  const offer = readRepo("lib/pricing/planes-offer.ts");

  assert.match(page, /getPlanesOfferCopy/);
  assert.match(page, /PLANES_ONE_OFF_PRODUCT_KEY/);
  assert.match(page, /getPackagePurchasability/);
  assert.doesNotMatch(page, /getActivePricingCategories/);
  assert.doesNotMatch(page, /getPackagesByCategory/);
  assert.doesNotMatch(page, /getAllPackagePurchasability/);

  assert.match(experience, /data-plan=\{plan\.id\}/);
  assert.match(experience, /data-plan="one-off"/);
  assert.match(experience, /data-membership-cta="non-transactional"/);
  assert.match(experience, /copy\.memberships\.monthly/);
  assert.match(experience, /productKey=\{PLANES_ONE_OFF_PRODUCT_KEY\}/);
  assert.match(experience, /PackagePurchaseButton/);
  assert.doesNotMatch(experience, /PackageCard/);
  assert.doesNotMatch(experience, /categories\.map/);

  assert.equal(PLANES_ONE_OFF_PRODUCT_KEY, "commercial_1");
  assert.equal(getPricingPackageById("commercial_1")?.displayPrice, 180);
  assert.equal(PRICING_PACKAGES.length, 8);

  assert.match(offer, /PLANES_ONE_OFF_PRODUCT_KEY = "commercial_1"/);
  assert.doesNotMatch(offer, /STRIPE_PRICE_ID/);
  assert.doesNotMatch(offer, /price_/);
  assert.doesNotMatch(offer, /createCheckout|checkout-session|webhook/);
});

test("membership CTAs are non-transactional and do not reuse Stripe prices", () => {
  const experience = readRepo("components/pricing/PlanesExperience.tsx");
  const offer = readRepo("lib/pricing/planes-offer.ts");
  const page = readRepo("app/planes/page.tsx");

  const membershipCta = experience.slice(
    experience.indexOf("function MembershipCard"),
    experience.indexOf("export default function PlanesExperience"),
  );
  assert.match(membershipCta, /disabled/);
  assert.match(membershipCta, /aria-disabled="true"/);
  assert.doesNotMatch(membershipCta, /PackagePurchaseButton/);
  assert.doesNotMatch(membershipCta, /productKey/);
  assert.doesNotMatch(membershipCta, /\/api\/payments\/checkout/);
  assert.doesNotMatch(membershipCta, /STRIPE_PRICE_ID_COMMERCIAL/);

  assert.doesNotMatch(offer, /STRIPE_PRICE_ID_COMMERCIAL_5|COMMERCIAL_10|COMMERCIAL_20/);
  assert.doesNotMatch(page, /STRIPE_PRICE_ID/);
  assert.match(page, /commercial_1 package for \/planes one-off checkout/);
});

test("old package-grid and anti-membership copy is gone from /planes surfaces", () => {
  const surfaces = [
    readRepo("app/planes/page.tsx"),
    readRepo("components/pricing/PlanesExperience.tsx"),
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
  assert.match(en, /Annual membership/);
  assert.match(en, /Monthly membership/);
  assert.match(en, /Talk to Director/);
});
