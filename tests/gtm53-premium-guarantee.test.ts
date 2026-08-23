/**
 * GTM #5.3 — Premium customer guarantee legal / copy alignment.
 *
 * Run: npm run test:gtm53
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type { Messages } from "../lib/i18n.ts";
import {
  PAYMENTS_POLICY,
  PRIVACY_POLICY,
  TERMS_POLICY,
  type LegalPolicyCopy,
} from "../lib/legal/policies.ts";
import { getPricingFaq, getPricingPackageById, PRICING_PACKAGES } from "../lib/pricing/index.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function flattenPolicy(copy: LegalPolicyCopy): string {
  return copy.sections
    .flatMap((section) =>
      section.blocks.flatMap((block) => {
        if (block.type === "ul") return block.items;
        if (block.type === "p-support") {
          return [`${block.before}${block.link}${block.after}`];
        }
        if (block.type === "p-email") {
          return [`${block.before}support@metaprom.com${block.after}`];
        }
        return [block.text];
      }),
    )
    .join("\n");
}

const es = JSON.parse(readRepo("messages/es.json")) as Messages;
const en = JSON.parse(readRepo("messages/en.json")) as Messages;
const master = readRepo("METAPROM_MASTER.md");
const paymentsEs = flattenPolicy(PAYMENTS_POLICY.es);
const paymentsEn = flattenPolicy(PAYMENTS_POLICY.en);
const termsEs = flattenPolicy(TERMS_POLICY.es);
const termsEn = flattenPolicy(TERMS_POLICY.en);
const privacyEs = flattenPolicy(PRIVACY_POLICY.es);
const privacyEn = flattenPolicy(PRIVACY_POLICY.en);
const planesEs = JSON.stringify(getPricingFaq("es"));
const planesEn = JSON.stringify(getPricingFaq("en"));

const ES_FAQ_ANSWER =
  "No es motivo de preocupación. Metaprom AI no te vende una generación de IA ni te deja con el resultado que haya salido.\n\nTú estás comprando un Comercial Premium terminado. La IA es sólo una parte de nuestro proceso de producción. Si una generación no funciona, seguimos trabajando hasta entregarte un comercial a tu satisfacción dentro del alcance del servicio contratado.\n\nY si no podemos lograrlo, te devolvemos tu dinero.";
const EN_FAQ_ANSWER =
  "That's not something you need to worry about. Metaprom AI doesn't sell you an AI generation or leave you with whatever result happens to come out.\n\nYou're purchasing a finished Premium Commercial. AI is only one part of our production process. If a generation doesn't work, we keep working until we deliver a commercial you're satisfied with, within the scope of the service you purchased.\n\nAnd if we can't deliver it, we'll refund your money.";

const CANONICAL_PACKAGES = [
  { id: "commercial_1", displayPrice: 180 },
  { id: "commercial_5", displayPrice: 640 },
  { id: "commercial_10", displayPrice: 990 },
  { id: "commercial_20", displayPrice: 1780 },
  { id: "assets_10", displayPrice: 99 },
  { id: "assets_25", displayPrice: 199 },
  { id: "assets_50", displayPrice: 349 },
  { id: "assets_100", displayPrice: 599 },
] as const;

test("Landing FAQ keeps the approved Premium guarantee and drops the old failed-generation answer", () => {
  const esItem = es.faq.items.find((item) => item.id === "generation-not-right");
  const enItem = en.faq.items.find((item) => item.id === "generation-not-right");

  assert.equal(
    esItem?.question,
    "¿Y si la generación de IA sale mal, como pasa tantas veces?",
  );
  assert.equal(esItem?.answer, ES_FAQ_ANSWER);
  assert.equal(
    enItem?.question,
    "What if the AI generation goes wrong, like it often does?",
  );
  assert.equal(enItem?.answer, EN_FAQ_ANSWER);

  const esFaq = JSON.stringify(es.faq);
  const enFaq = JSON.stringify(en.faq);
  assert.doesNotMatch(esFaq, /no necesariamente es el producto terminado/);
  assert.doesNotMatch(esFaq, /Qué pasa si una generación no queda bien/);
  assert.doesNotMatch(enFaq, /not necessarily the finished product/);
  assert.doesNotMatch(enFaq, /What happens if a generation doesn't come out right/);
  assert.match(readRepo("components/landing/LandingFaq.tsx"), /split\("\\n\\n"\)/);
});

test("Payments & Refunds refund a Premium Commercial Metaprom AI cannot deliver", () => {
  assert.match(readRepo("app/pagos-reembolsos/page.tsx"), /PAYMENTS_POLICY/);
  assert.match(paymentsEs, /Comercial Premium terminado|comercial publicitario terminado/);
  assert.match(paymentsEs, /no es una entrega/);
  assert.match(paymentsEs, /continúa la producción y la corrección/);
  assert.match(paymentsEs, /se reembolsará el pago correspondiente/);
  assert.match(paymentsEn, /finished advertising commercial/);
  assert.match(paymentsEn, /is not delivery/);
  assert.match(paymentsEn, /continues production and correction/);
  assert.match(paymentsEn, /will be refunded/);

  assert.doesNotMatch(paymentsEs, /casos excepcionales sin resolver/);
  assert.doesNotMatch(paymentsEn, /may receive an additional correction/);
  assert.doesNotMatch(paymentsEs, /a nuestra entera discreción|única discreción/);
  assert.doesNotMatch(paymentsEn, /sole discretion/);
});

test("Payments keep non-delivery distinctions and do not promise refund for any reason", () => {
  assert.match(paymentsEs, /cancelación por tu parte/);
  assert.match(paymentsEs, /abandono del proyecto/);
  assert.match(paymentsEs, /cambios del producto o del alcance/);
  assert.match(paymentsEs, /entrega ya satisfactoria/);
  assert.match(paymentsEs, /fraude/);
  assert.match(paymentsEn, /cancellation by you/);
  assert.match(paymentsEn, /abandoning the project/);
  assert.match(paymentsEn, /changing the requested product or scope/);
  assert.match(paymentsEn, /satisfactory delivery/);
  assert.match(paymentsEn, /[Ff]raud/);

  assert.match(paymentsEs, /Tampoco incluye conceptos ilimitados/);
  assert.match(paymentsEn, /does not include unlimited concepts/);
  assert.doesNotMatch(paymentsEs, /reembolso incondicional|cualquier motivo/);
  assert.doesNotMatch(paymentsEn, /unconditional refund|any reason/);
});

test("Terms keep final-content review without shifting failed-generation risk to the customer", () => {
  assert.match(readRepo("app/terminos/page.tsx"), /TERMS_POLICY/);
  assert.match(termsEs, /Durante la producción de un Comercial Premium, Metaprom AI asume el riesgo de producción/);
  assert.match(termsEs, /Una generación fallida no se convierte en tu problema/);
  assert.match(termsEs, /el pago correspondiente se reembolsa/);
  assert.match(termsEs, /revisar el contenido final antes de publicarlo/);
  assert.match(
    termsEs,
    /no significa que aceptes cualquier resultado que un modelo de IA haya generado durante la producción/,
  );
  assert.match(termsEn, /bears the production risk/);
  assert.match(termsEn, /does not become your problem merely because/);
  assert.match(termsEn, /corresponding payment is refunded/);
  assert.match(termsEn, /reviewing the final content before publishing/);
  assert.match(termsEn, /not the same as accepting whatever an AI model generated/);

  assert.doesNotMatch(termsEn, /you must review each result because AI can make mistakes, so the output is yours/);
  assert.match(termsEs, /Tampoco garantizamos el cumplimiento de políticas de plataformas/);
  assert.match(termsEn, /do not guarantee platform-policy compliance/);
});

test("Planes FAQ matches the guarantee without unlimited-revision or discretionary-refund copy", () => {
  assert.match(planesEs, /Comercial Premium terminado/);
  assert.match(planesEs, /se reembolsa el pago correspondiente/);
  assert.match(planesEs, /no incluye conceptos ilimitados/);
  assert.match(planesEs, /esta garantía no aplica de forma automática/);
  assert.doesNotMatch(planesEs, /podemos ofrecer una corrección adicional o un reembolso/);
  assert.doesNotMatch(planesEs, /revisión de buena fe/);

  assert.match(planesEn, /finished Premium Commercial/);
  assert.match(planesEn, /corresponding payment is refunded/);
  assert.match(planesEn, /does not include unlimited concepts/);
  assert.match(planesEn, /does not apply automatically/);
  assert.doesNotMatch(planesEn, /may receive an additional correction or refund/);
  assert.doesNotMatch(planesEn, /good-faith review/);
});

test("Premium checkout links to aligned legal pages and does not contradict the guarantee", () => {
  const checkout = readRepo("components/pricing/PackagePurchaseButton.tsx");
  const notice = readRepo("components/legal/LegalNotice.tsx");
  assert.match(checkout, /LegalNotice/);
  assert.match(notice, /href="\/terminos"/);
  assert.match(notice, /href="\/privacidad"/);
  assert.match(notice, /href="\/pagos-reembolsos"/);
  assert.doesNotMatch(checkout, /may refund|might consider|sole discretion|podremos reembolsar/);
  assert.doesNotMatch(checkout, /Stripe Price|STRIPE_PRICE_ID|webhook/);
});

test("MASTER records the published Premium guarantee and its boundary", () => {
  assert.match(master, /MASTER UPDATE — GTM #5\.3 Premium Customer Guarantee \(August 20, 2026\)/);
  assert.match(master, /PUBLISHED CUSTOMER GUARANTEE/);
  assert.match(master, /finished advertising product, not an AI-generation attempt/);
  assert.match(master, /corresponding payment \*\*is refunded\*\*/);
  assert.match(master, /does \*\*not\*\* create unlimited revisions/);
  assert.match(master, /Do \*\*not\*\* begin GTM #6 from this record/);
  assert.match(master, /no longer unpublished/);
});

test("ES and EN guarantee meaning stays aligned without unlimited or any-reason refunds", () => {
  const surfaces = [ES_FAQ_ANSWER, EN_FAQ_ANSWER, paymentsEs, paymentsEn, termsEs, termsEn, planesEs, planesEn];
  for (const surface of surfaces) {
    assert.match(surface, /Comercial Premium|Premium Commercial/i);
    assert.match(surface, /reembols|refund|devolvemos tu dinero|refund your money/i);
    assert.doesNotMatch(surface, /reembolso incondicional|unconditional refund|for any reason|por cualquier motivo/);
  }

  assert.doesNotMatch(en.faq.items.map((item) => item.answer).join("\n"), /[¿¡]/);
  assert.doesNotMatch(paymentsEn, /[¿¡]|tú estás|se reembolsará/);
  assert.doesNotMatch(termsEn, /[¿¡]|Durante la producción/);
  assert.doesNotMatch(planesEn, /[¿¡]|se reembolsa el pago/);
});

test("GTM #5.3 does not change prices, Stripe, or GTM #1–#5.2 payment protections", () => {
  assert.equal(PRICING_PACKAGES.length, 8);
  for (const expected of CANONICAL_PACKAGES) {
    const pkg = getPricingPackageById(expected.id);
    assert.equal(pkg?.displayPrice, expected.displayPrice, expected.id);
    assert.equal(pkg?.currency, "MXN", expected.id);
  }

  const checkoutRoute = readRepo("app/api/payments/checkout/route.ts");
  const webhook = readRepo("app/api/payments/webhook/route.ts");
  const integrity = readRepo("lib/payments/purchase-integrity.ts");
  assert.match(checkoutRoute, /Authentication required/);
  assert.match(checkoutRoute, /canBindAssetToPackage/);
  assert.match(webhook, /shouldFulfillPremiumForProduct/);
  assert.match(integrity, /resolveTrustedGrantPackage/);
  assert.match(readRepo("lib/security/cost-control.ts"), /enforceSupportCostControl/);
  assert.match(readRepo("lib/security/cost-control.ts"), /getCostControlStore/);
  assert.match(readRepo("lib/security/closed-production-surfaces.ts"), /isClosedProductionSurfacePath/);
});

test("Privacy is bilingual and Terms add Share, minors, and content/output clarity", () => {
  assert.match(readRepo("app/privacidad/page.tsx"), /PRIVACY_POLICY/);
  assert.equal(PRIVACY_POLICY.es.title, "Aviso de Privacidad");
  assert.equal(PRIVACY_POLICY.en.title, "Privacy Notice");
  assert.match(privacyEs, /Metaprom AI/);
  assert.match(privacyEs, /support@metaprom\.com/);
  assert.match(privacyEn, /support@metaprom\.com/);
  assert.match(privacyEs, /medición y atribución de primer partido/);
  assert.match(privacyEn, /first-party measurement and attribution/);
  assert.match(privacyEs, /de forma efímera/);
  assert.match(privacyEn, /ephemerally/);
  assert.match(privacyEs, /no ser indexadas/);
  assert.match(privacyEn, /not to be indexed/);
  assert.doesNotMatch(privacyEs, /entidad jurídica|domicilio de privacidad deberá|RFC|S\.A\. de C\.V\./);
  assert.doesNotMatch(privacyEn, /legal entity still needs|to be constituted|tax id/i);
  assert.doesNotMatch(
    `${privacyEs}\n${privacyEn}`,
    /Supabase|Vercel|OpenAI|Vertex|GCS|Resend|Google Cloud Storage/,
  );
  assert.doesNotMatch(privacyEn, /[¿¡]|El responsable del tratamiento/);

  assert.match(termsEs, /contenido identificable de menores/);
  assert.match(termsEn, /identifiable content of minors/);
  assert.match(termsEs, /licencia limitada/);
  assert.match(termsEn, /limited, non-exclusive license/);
  assert.match(termsEs, /puede no ser único/);
  assert.match(termsEn, /may not be unique/);
  assert.match(termsEs, /URL pública/);
  assert.match(termsEn, /public URL is created/);
  assert.match(termsEs, /no ser indexadas por buscadores/);
  assert.match(termsEn, /not to be indexed by search engines/);
  assert.doesNotMatch(
    `${termsEs}\n${termsEn}\n${privacyEs}\n${privacyEn}`,
    /no ofrece hoy un control en la aplicación para revocar|does not currently offer an in-app control to revoke or delete/,
  );
  assert.match(paymentsEs, /No son suscripciones/);
  assert.match(paymentsEs, /paquetes prepagados/);
  assert.match(paymentsEn, /prepaid packages/);
});
