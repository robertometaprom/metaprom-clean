/**
 * Legal & Trust implementation — focused copy and surface checks.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type { Messages } from "../lib/i18n.ts";
import {
  PRIVACY_POLICY,
  TERMS_POLICY,
  PAYMENTS_POLICY,
  type LegalPolicyCopy,
} from "../lib/legal/policies.ts";
import { buildPublicPreviewMetadata } from "../lib/preview/public-preview-metadata.ts";
import { PUBLIC_SUPPORT_EMAIL } from "../lib/support/public.ts";

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
          return [`${block.before}${PUBLIC_SUPPORT_EMAIL}${block.after}`];
        }
        return [block.text];
      }),
    )
    .join("\n");
}

const es = JSON.parse(readRepo("messages/es.json")) as Messages;
const en = JSON.parse(readRepo("messages/en.json")) as Messages;
const privacyEs = flattenPolicy(PRIVACY_POLICY.es);
const privacyEn = flattenPolicy(PRIVACY_POLICY.en);
const termsEs = flattenPolicy(TERMS_POLICY.es);
const termsEn = flattenPolicy(TERMS_POLICY.en);
const paymentsEs = flattenPolicy(PAYMENTS_POLICY.es);
const paymentsEn = flattenPolicy(PAYMENTS_POLICY.en);

const VENDOR_INVENTORY =
  /Supabase|Vercel|OpenAI|Vertex|Google Cloud Storage|\bGCS\b|Resend/;

test("Privacy is available in Spanish and English", () => {
  assert.match(readRepo("app/privacidad/page.tsx"), /PRIVACY_POLICY/);
  assert.equal(PRIVACY_POLICY.es.title, "Aviso de Privacidad");
  assert.equal(PRIVACY_POLICY.en.title, "Privacy Notice");
  assert.match(privacyEs, /autenticación, cuenta y sesión/);
  assert.match(privacyEn, /Authentication, account, and session data/);
  assert.match(privacyEs, /Prompts e instrucciones/);
  assert.match(privacyEn, /Prompts and instructions/);
  assert.match(privacyEs, /Metadatos de pago/);
  assert.match(privacyEn, /Payment and billing metadata/);
  assert.match(privacyEs, /Eventos de Share/);
  assert.match(privacyEn, /Share events/);
  assert.match(privacyEs, /Comunicaciones de soporte/);
  assert.match(privacyEn, /Support communications/);
  assert.match(privacyEs, /referrer y parámetros UTM|Referrer y atribución UTM/);
  assert.match(privacyEn, /Referrer and UTM/);
});

test("no legal-entity placeholder remains and operator is Metaprom AI", () => {
  const surfaces = [
    privacyEs,
    privacyEn,
    termsEs,
    termsEn,
    readRepo("app/privacidad/page.tsx"),
    readRepo("lib/legal/policies.ts"),
  ].join("\n");
  assert.doesNotMatch(
    surfaces,
    /entidad jurídica definitiva|cuando se constituya|legal entity still needs|to be constituted/,
  );
  assert.match(privacyEs, /El responsable del tratamiento de los datos personales es Metaprom AI/);
  assert.match(privacyEn, /The controller of personal data is Metaprom AI/);
});

test("public support contact is support@metaprom.com and Gmail stays private", () => {
  assert.equal(PUBLIC_SUPPORT_EMAIL, "support@metaprom.com");
  assert.match(readRepo("components/landing/Footer.tsx"), /SupportEmailLink/);
  assert.match(privacyEs, /support@metaprom\.com/);
  assert.match(privacyEn, /support@metaprom\.com/);
  assert.doesNotMatch(
    readRepo("components/landing/Footer.tsx"),
    /robertometaprom@gmail\.com/,
  );
  assert.doesNotMatch(privacyEs, /gmail\.com/);
  assert.doesNotMatch(privacyEn, /gmail\.com/);
});

test("Privacy describes processor categories without a vendor inventory", () => {
  assert.match(privacyEs, /categorías de proveedores/);
  assert.match(privacyEn, /categories of providers/);
  assert.match(privacyEs, /Google se usa para iniciar sesión y Stripe para procesar pagos/);
  assert.match(privacyEn, /Google is used for sign-in and Stripe is used to process payments/);
  assert.doesNotMatch(privacyEs, VENDOR_INVENTORY);
  assert.doesNotMatch(privacyEn, VENDOR_INVENTORY);
});

test("minors-upload prohibition exists without inventing an 18\+ age gate", () => {
  assert.match(termsEs, /contenido identificable de menores de edad/);
  assert.match(termsEn, /identifiable content of minors/);
  assert.doesNotMatch(termsEs, /debes tener 18|mayoría de edad|18\+/);
  assert.doesNotMatch(termsEn, /must be 18|18\+|age of majority/);
});

test("Share legal disclosure and noindex/metadata privacy exist", () => {
  const legalCopy = [termsEs, termsEn, privacyEs, privacyEn].join("\n");

  assert.match(termsEs, /se crea una URL pública/);
  assert.match(termsEn, /a public URL is created/);
  assert.match(privacyEs, /se crea una URL pública/);
  assert.match(privacyEn, /a public URL is created/);
  assert.match(termsEs, /no expone de forma intencional el correo/);
  assert.match(termsEn, /does not intentionally expose your account email/);
  assert.match(privacyEs, /configuradas para no ser indexadas/);
  assert.match(privacyEn, /configured not to be indexed/);
  assert.match(termsEs, /ayuda con contenido compartido[\s\S]*support@metaprom\.com/);
  assert.match(termsEn, /help with shared content[\s\S]*support@metaprom\.com/);
  assert.match(privacyEs, /ayuda con contenido compartido[\s\S]*support@metaprom\.com/);
  assert.match(privacyEn, /help with shared content[\s\S]*support@metaprom\.com/);
  assert.doesNotMatch(
    legalCopy,
    /puedes (revocar|eliminar) un Share|you can (revoke|delete) a Share|ofrece un control en la aplicación para (revocar|eliminar)|offers an in-app control to (revoke|delete)/i,
  );
  assert.doesNotMatch(
    legalCopy,
    /no (hay|ofrece).{0,80}control.{0,80}(revocar|eliminar)|no in-app (revoke|delete)|does not currently offer an in-app control to revoke or delete/i,
  );

  const sharePage = readRepo("app/p/[share_slug]/page.tsx");
  assert.match(sharePage, /robots: \{ index: false, follow: false \}/);
  assert.match(readRepo("components/public/PublicCommercialFooter.tsx"), /LegalLinks/);

  const metadata = buildPublicPreviewMetadata({
    shareSlug: "23456789ABC",
    locale: "es",
    kind: "commercial",
  });
  assert.equal(metadata.title, "Comercial creado con Metaprom AI");
  assert.doesNotMatch(metadata.title, /ai_instructions|prompt/i);
  assert.doesNotMatch(JSON.stringify(metadata), /Cafe artesanal|SECRET/);
});

test("checkout legal links and duration copy are aligned", () => {
  assert.match(readRepo("components/checkout/Checkout.tsx"), /LegalNotice/);
  assert.match(readRepo("components/experience/ExperienceFlow.tsx"), /LegalNotice/);
  assert.match(readRepo("components/GoogleSignInButton.tsx"), /kind="auth"/);
  assert.match(readRepo("components/checkout/Checkout.tsx"), /hasta 8 segundos/);
  assert.match(readRepo("components/experience/ExperienceFlow.tsx"), /Hasta 8 segundos/);
  assert.match(readRepo("components/studio/CinematicReveal.tsx"), /hasta 8 segundos/);
  assert.doesNotMatch(
    [
      readRepo("components/checkout/Checkout.tsx"),
      readRepo("components/experience/ExperienceFlow.tsx"),
      readRepo("components/studio/CinematicReveal.tsx"),
    ].join("\n"),
    /10-15 segundos|10–15 segundos/,
  );
});

test("landing examples no longer say real business owners or customer results", () => {
  assert.equal(es.testimonials.headline, "Ejemplos.");
  assert.equal(en.testimonials.headline, "Examples.");
  assert.doesNotMatch(JSON.stringify(es.testimonials), /Dueños de negocios reales/);
  assert.doesNotMatch(JSON.stringify(en.testimonials), /Real business owners/);
  assert.doesNotMatch(
    JSON.stringify({ es: es.testimonials, en: en.testimonials }),
    /fictitious|fictional businesses|real customers|testimonials/i,
  );
});

test("legal navigation is present on Studio, Credits, purchase, and Share", () => {
  assert.match(readRepo("components/studio/StudioShell.tsx"), /href="\/terminos"/);
  assert.match(readRepo("components/studio/StudioShell.tsx"), /href="\/privacidad"/);
  assert.match(readRepo("app/creditos/page.tsx"), /LegalLinks/);
  assert.match(readRepo("app/planes/compra/page.tsx"), /LegalLinks/);
  assert.match(readRepo("components/public/PublicCommercialFooter.tsx"), /LegalLinks/);
});

test("payment model, Premium guarantee, and Stripe wording stay accurate", () => {
  assert.match(paymentsEs, /paquetes prepagados/);
  assert.match(paymentsEs, /No son suscripciones/);
  assert.match(paymentsEn, /prepaid packages/);
  assert.match(paymentsEn, /not subscriptions/);
  assert.match(paymentsEs, /pesos mexicanos \(MXN\)/);
  assert.match(paymentsEs, /no vencen/);
  assert.match(paymentsEs, /se reembolsará el pago correspondiente/);
  assert.match(termsEs, /Metaprom AI asume el riesgo de producción/);
  assert.match(
    readRepo("lib/pricing/catalog.ts"),
    /Pagos procesados mediante Stripe/,
  );
  assert.doesNotMatch(
    readRepo("lib/pricing/catalog.ts"),
    /Pagos seguros mediante Stripe/,
  );
  assert.doesNotMatch(`${privacyEs}\n${privacyEn}`, /GDPR|CCPA|PCI|SOC 2|bank-level|enterprise-grade/);
});

test("analytics and Facebook attribution files were not modified by this legal block", () => {
  const funnel = readRepo("lib/analytics/attribution.ts");
  const cookies = readRepo("lib/analytics/cookies.ts");
  const record = readRepo("lib/analytics/record.ts");
  assert.match(funnel, /origin_kind|OriginKind/);
  assert.match(cookies, /applyFirstPartyAnalyticsCookies/);
  assert.doesNotMatch(record, /facebook\.net|fbq\(|gtag\(/);
});
