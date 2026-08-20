/**
 * GTM #5 — commercial message / What is Metaprom AI / FAQ.
 *
 * Run: npm run test:gtm5
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { buildLandingContent } from "../lib/landing-content.ts";
import {
  GTM5_FAQ_IDS,
  GTM5_FLOW_STEP_IDS,
  GTM5_IMAGE_CHANNEL_IDS,
  GTM5_VIDEO_PLATFORM_IDS,
} from "../lib/gtm5.ts";
import type { Messages } from "../lib/i18n.ts";
import {
  isClosedProductionSurfacePath,
  shouldCloseProductionSurfaces,
} from "../lib/security/closed-production-surfaces.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

const es = JSON.parse(readRepo("messages/es.json")) as Messages;
const en = JSON.parse(readRepo("messages/en.json")) as Messages;

const GTM5_LANDING_FILES = [
  "app/page.tsx",
  "lib/landing-content.ts",
  "lib/gtm5.ts",
  "components/landing/WhatIsMetaprom.tsx",
  "components/landing/SimpleSteps.tsx",
  "components/landing/ImageUseCases.tsx",
  "components/landing/RealEstateUseCase.tsx",
  "components/landing/VideoUseCases.tsx",
  "components/landing/AiVsMetaprom.tsx",
  "components/landing/LandingFaq.tsx",
];

function gtm5Text(messages: Messages): string {
  return JSON.stringify({
    whatIs: messages.whatIs,
    steps: messages.steps,
    imageUseCases: messages.imageUseCases,
    realEstate: messages.realEstate,
    videoUseCases: messages.videoUseCases,
    aiVs: messages.aiVs,
    faq: messages.faq,
  });
}

test("GTM #5 ships the exact What is Metaprom AI message in ES and EN", () => {
  assert.equal(es.whatIs.headline, "¿Qué es Metaprom AI?");
  assert.equal(
    es.whatIs.lead,
    "Metaprom AI convierte las fotos de tu producto, propiedad, servicio o negocio en material publicitario listo para usar.",
  );
  assert.equal(
    es.whatIs.offer,
    "Crea imágenes Premium para marketplaces, tiendas en línea, Real Estate, redes sociales y materiales impresos; o transforma tus ideas en comerciales profesionales para las plataformas donde está tu audiencia.",
  );
  assert.equal(
    es.whatIs.noSkills,
    "No necesitas aprender diseño, edición de video ni inteligencia artificial.",
  );
  assert.equal(
    es.whatIs.director,
    "Muéstrale a Director lo que tienes y dile qué quieres lograr.",
  );
  assert.equal(es.whatIs.sloganGenerate, "La IA genera.");
  assert.equal(es.whatIs.sloganProduce, "Metaprom AI produce.");

  assert.equal(en.whatIs.headline, "What is Metaprom AI?");
  assert.equal(
    en.whatIs.lead,
    "Metaprom AI turns photos of your product, property, service, or business into advertising content ready to use.",
  );
  assert.equal(
    en.whatIs.offer,
    "Create Premium images for marketplaces, online stores, Real Estate, social media, and printed advertising; or turn your ideas into professional commercials for the platforms where your audience is.",
  );
  assert.equal(
    en.whatIs.noSkills,
    "You don't need to learn design, video editing, or artificial intelligence.",
  );
  assert.equal(
    en.whatIs.director,
    "Show Director what you have and tell it what you want to achieve.",
  );
  assert.equal(en.whatIs.sloganGenerate, "AI generates.");
  assert.equal(en.whatIs.sloganProduce, "Metaprom AI produces.");
});

test("GTM #5 product flow is four optional-path steps with exact copy", () => {
  assert.deepEqual([...GTM5_FLOW_STEP_IDS], [
    "photo",
    "direction",
    "premium",
    "commercial",
  ]);

  assert.equal(es.steps.items.photo.title, "FOTO");
  assert.equal(
    es.steps.items.photo.body,
    "Sube una foto de lo que quieres promocionar.",
  );
  assert.equal(es.steps.items.direction.title, "INSTRUCCIÓN");
  assert.equal(
    es.steps.items.direction.body,
    "Dile a Director qué quieres lograr. Escríbelo como lo dirías normalmente.",
  );
  assert.equal(es.steps.items.premium.title, "PREMIUM");
  assert.equal(
    es.steps.items.premium.body,
    "Convierte tu material en imágenes publicitarias profesionales.",
  );
  assert.equal(es.steps.items.commercial.title, "COMERCIAL");
  assert.equal(
    es.steps.items.commercial.body,
    "Lleva tu concepto más lejos con un comercial profesional listo para compartir.",
  );
  assert.equal(
    es.steps.supporting,
    "Una foto puede ser el principio de toda una campaña.",
  );

  assert.equal(en.steps.items.photo.title, "PHOTO");
  assert.equal(
    en.steps.items.photo.body,
    "Upload a photo of what you want to promote.",
  );
  assert.equal(en.steps.items.direction.title, "DIRECTION");
  assert.equal(
    en.steps.items.direction.body,
    "Tell Director what you want to achieve. Say it naturally.",
  );
  assert.equal(en.steps.items.premium.title, "PREMIUM");
  assert.equal(
    en.steps.items.premium.body,
    "Turn your material into professional advertising images.",
  );
  assert.equal(en.steps.items.commercial.title, "COMMERCIAL");
  assert.equal(
    en.steps.items.commercial.body,
    "Take your concept further with a professional commercial ready to share.",
  );
  assert.equal(
    en.steps.supporting,
    "One photo can be the beginning of an entire campaign.",
  );

  const esContent = buildLandingContent("es", es);
  assert.deepEqual(
    esContent.productFlow.steps.map((step) => step.id),
    [...GTM5_FLOW_STEP_IDS],
  );
});

test("GTM #5 image and video use cases surface the required channels as text labels", () => {
  assert.deepEqual(
    GTM5_IMAGE_CHANNEL_IDS.map((id) => es.imageUseCases.channels[id]),
    [
      "Amazon",
      "Mercado Libre",
      "Shopify",
      "Real Estate",
      "Menús",
      "Flyers",
      "Lonas",
      "Catálogos",
      "Redes sociales",
      "Publicidad digital",
    ],
  );
  assert.deepEqual(
    GTM5_IMAGE_CHANNEL_IDS.map((id) => en.imageUseCases.channels[id]),
    [
      "Amazon",
      "Mercado Libre",
      "Shopify",
      "Real Estate",
      "Menus",
      "Flyers",
      "Banners",
      "Catalogs",
      "Social media",
      "Digital advertising",
    ],
  );
  assert.deepEqual(
    GTM5_VIDEO_PLATFORM_IDS.map((id) => es.videoUseCases.platforms[id]),
    ["TikTok", "Instagram", "Facebook", "YouTube"],
  );
  assert.deepEqual(
    GTM5_VIDEO_PLATFORM_IDS.map((id) => en.videoUseCases.platforms[id]),
    ["TikTok", "Instagram", "Facebook", "YouTube"],
  );

  assert.equal(
    es.imageUseCases.headline,
    "Imágenes para donde realmente vendes",
  );
  assert.equal(en.imageUseCases.headline, "Images for where you actually sell");
  assert.equal(
    es.videoUseCases.headline,
    "Comerciales para donde está tu audiencia",
  );
  assert.equal(
    en.videoUseCases.headline,
    "Commercials for where your audience is",
  );
  assert.equal(
    es.imageUseCases.publishNote,
    "Metaprom AI crea el contenido. Tú decides dónde publicarlo.",
  );
  assert.equal(
    en.videoUseCases.publishNote,
    "Metaprom AI creates the content. You decide where to publish it.",
  );

  const imageSection = readRepo("components/landing/ImageUseCases.tsx");
  const videoSection = readRepo("components/landing/VideoUseCases.tsx");
  assert.doesNotMatch(imageSection, /<(?:img|Image)\b/);
  assert.doesNotMatch(videoSection, /<(?:img|Image)\b/);
  assert.doesNotMatch(imageSection, /\/logos\//);
  assert.doesNotMatch(videoSection, /\/logos\//);
  assert.doesNotMatch(imageSection, /amazon-white/);
  assert.doesNotMatch(videoSection, /simpleicons|svgrepo/i);
});

test("GTM #5 Real Estate copy is presentation, not a fictional property", () => {
  assert.equal(es.realEstate.headlineBetter, "MEJOR PRESENTACIÓN.");
  assert.equal(es.realEstate.headlineSame, "MISMA PROPIEDAD.");
  assert.equal(
    es.realEstate.intro,
    "Una propiedad no necesita convertirse en algo que no es para verse mejor.",
  );
  assert.equal(es.realEstate.supportingImprove, "Mejoramos la presentación.");
  assert.equal(es.realEstate.supportingInvent, "No inventamos la propiedad.");

  assert.equal(en.realEstate.headlineBetter, "BETTER PRESENTATION.");
  assert.equal(en.realEstate.headlineSame, "SAME PROPERTY.");
  assert.equal(
    en.realEstate.intro,
    "A property doesn't need to become something it isn't in order to look better.",
  );
  assert.equal(en.realEstate.supportingImprove, "We improve the presentation.");
  assert.equal(en.realEstate.supportingInvent, "We don't invent the property.");

  const esRe = `${es.realEstate.copy} ${es.faq.items.find((item) => item.id === "real-estate")?.answer}`;
  const enRe = `${en.realEstate.copy} ${en.faq.items.find((item) => item.id === "real-estate")?.answer}`;
  assert.match(esRe, /características esenciales/);
  assert.match(enRe, /essential characteristics/);
  assert.doesNotMatch(esRe, /metros cuadrados|habitaciones nuevas|MLS/);
  assert.doesNotMatch(enRe, /square footage|new rooms|MLS/);
});

test("GTM #5 AI vs Metaprom AI distinguishes generation from finished advertising", () => {
  assert.equal(es.aiVs.generate, "La IA genera.");
  assert.equal(es.aiVs.produce, "Metaprom AI produce.");
  assert.equal(en.aiVs.generate, "AI generates.");
  assert.equal(en.aiVs.produce, "Metaprom AI produces.");
  assert.match(es.aiVs.body, /generación no es lo mismo que un producto publicitario terminado/);
  assert.match(
    en.aiVs.body,
    /generation is not the same thing as a finished advertising product/,
  );
  assert.equal(es.aiVs.closeLearn, "No vienes a Metaprom AI a aprender IA.");
  assert.equal(es.aiVs.closeCreate, "Vienes a hacer publicidad.");
  assert.equal(en.aiVs.closeLearn, "You don't come to Metaprom AI to learn AI.");
  assert.equal(en.aiVs.closeCreate, "You come to create advertising.");
  assert.doesNotMatch(es.aiVs.body + es.aiVs.process, /mala|inútil|basura/);
  assert.doesNotMatch(en.aiVs.body + en.aiVs.process, /bad AI|useless|garbage/);
});

test("GTM #5 FAQ has seven localized items without extra legal promises", () => {
  assert.deepEqual(
    es.faq.items.map((item) => item.id),
    [...GTM5_FAQ_IDS],
  );
  assert.deepEqual(
    en.faq.items.map((item) => item.id),
    [...GTM5_FAQ_IDS],
  );
  assert.equal(es.faq.items.length, 7);
  assert.equal(en.faq.items.length, 7);

  assert.equal(
    es.faq.items[0]?.question,
    "¿Necesito saber usar inteligencia artificial?",
  );
  assert.equal(en.faq.items[0]?.question, "Do I need to know how to use AI?");
  assert.equal(
    es.faq.items[6]?.question,
    "¿Qué estoy comprando cuando contrato un Comercial Premium?",
  );
  assert.equal(
    en.faq.items[6]?.question,
    "What am I buying when I purchase a Premium Commercial?",
  );

  const esFaq = JSON.stringify(es.faq);
  const enFaq = JSON.stringify(en.faq);
  assert.doesNotMatch(esFaq, /ilimitad|reembolso incondicional|propiedad intelectual|licencia exclusiva/i);
  assert.doesNotMatch(enFaq, /unlimited|unconditional refund|ownership|license/i);
});

test("GTM #5 customer-facing copy uses Metaprom AI and stays bilingual without leakage", () => {
  const esText = gtm5Text(es);
  const enText = gtm5Text(en);

  for (const match of esText.matchAll(/Metaprom(?! AI)/g)) {
    assert.fail(`ES GTM #5 copy contains bare Metaprom: ${match[0]}`);
  }
  for (const match of enText.matchAll(/Metaprom(?! AI)/g)) {
    assert.fail(`EN GTM #5 copy contains bare Metaprom: ${match[0]}`);
  }

  assert.doesNotMatch(enText, /[¿¡]/);
  assert.doesNotMatch(enText, /\b(Muéstrale|necesitas|imágenes|Lonas|Catálogos|Menús|dónde|Tú)\b/);
  assert.doesNotMatch(esText, /What is Metaprom AI\?/);
  assert.doesNotMatch(esText, /You don't need/);
  assert.doesNotMatch(esText, /Images for where you actually sell/);
  assert.doesNotMatch(esText, /Better presentation/i);
  assert.doesNotMatch(esText, /Frequently asked questions/);
});

test("GTM #5 landing files have no numeric prices and no partnership implication", () => {
  const pricePattern = /\$\s*\d|MXN\s*\$|\bUSD\b/;
  const partnershipPattern =
    /partner(?:ship)?|endorsement|integrat(?:e|ion)|official\s+(?:partner|integration)|powered by Amazon/i;

  for (const file of [...GTM5_LANDING_FILES, "messages/es.json", "messages/en.json"]) {
    const source = readRepo(file);
    assert.equal(pricePattern.test(source), false, file);
  }

  for (const file of GTM5_LANDING_FILES) {
    const source = readRepo(file);
    assert.equal(partnershipPattern.test(source), false, file);
  }

  const page = readRepo("app/page.tsx");
  assert.match(page, /WhatIsMetaprom/);
  assert.match(page, /ImageUseCases/);
  assert.match(page, /RealEstateUseCase/);
  assert.match(page, /VideoUseCases/);
  assert.match(page, /AiVsMetaprom/);
  assert.match(page, /LandingFaq/);
  assert.match(page, /SimpleSteps productFlow/);
  assert.match(readRepo("components/landing/SimpleSteps.tsx"), /id="how-it-works"/);
  assert.match(readRepo("components/landing/LandingFaq.tsx"), /aria-expanded/);
});

test("GTM #5 preserves Studio/Planes paths, locale chrome, and closed GTM #1 surfaces", () => {
  const esContent = buildLandingContent("es", es);
  const enContent = buildLandingContent("en", en);

  assert.equal(esContent.cinema.primaryCtaHref, "/studio");
  assert.equal(enContent.cinema.primaryCtaHref, "/studio");
  assert.equal(esContent.cinema.secondaryCtaHref, "#how-it-works");
  assert.equal(esContent.pricing.ctaHref, "/planes");
  assert.equal(enContent.pricing.ctaHref, "/planes");

  const navbar = readRepo("components/Navbar.tsx");
  assert.match(navbar, /href="\/planes"/);
  assert.match(navbar, /LocaleSwitcher/);
  assert.match(readRepo("components/AuthButton.tsx"), /href="\/login"/);

  assert.equal(isClosedProductionSurfacePath("/dashboard"), true);
  assert.equal(isClosedProductionSurfacePath("/video-test"), true);
  assert.equal(isClosedProductionSurfacePath("/api/diagnose"), true);
  assert.equal(isClosedProductionSurfacePath("/studio"), false);
  assert.equal(isClosedProductionSurfacePath("/planes"), false);
  assert.equal(shouldCloseProductionSurfaces("production"), true);
});
