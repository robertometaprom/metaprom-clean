/**
 * GTM #5 — commercial message / What is Metaprom AI / FAQ.
 *
 * Run: npm run test:gtm5
 */
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
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
  "components/landing/CommercialVideo.tsx",
  "components/landing/CinemaStage.tsx",
  "lib/platform-marks.ts",
  "components/landing/PlatformMark.tsx",
  "lib/showcases.ts",
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
  const marks = readRepo("lib/platform-marks.ts");
  const shopifySvg = readRepo("public/logos/platforms/shopify.svg");

  assert.match(imageSection, /IMAGE_CHANNEL_MARKS/);
  assert.match(videoSection, /VIDEO_PLATFORM_MARKS/);
  assert.match(imageSection, /items-center justify-center/);
  assert.match(videoSection, /items-center justify-center/);
  assert.match(marks, /\/logos\/platforms\/amazon\.svg/);
  assert.match(marks, /\/logos\/platforms\/mercado-libre-final\.png/);
  assert.match(marks, /\/logos\/platforms\/shopify\.svg/);
  assert.match(marks, /\/logos\/platforms\/tiktok\.svg/);
  assert.match(marks, /\/logos\/platforms\/instagram\.svg/);
  assert.match(marks, /\/logos\/platforms\/facebook\.svg/);
  assert.match(marks, /\/logos\/platforms\/youtube\.svg/);
  assert.doesNotMatch(marks, /mercado-libre\.svg|mercado-libre\.png|mercado-libre-dark|logo-approval-comparison/);
  assert.doesNotMatch(imageSection, /amazon-white/);
  assert.doesNotMatch(imageSection, /simpleicons|svgrepo/i);
  assert.doesNotMatch(videoSection, /simpleicons|svgrepo/i);
  assert.doesNotMatch(shopifySvg, /SVG Repo|svgrepo|simpleicons/i);
  assert.match(shopifySvg, /#95bf46|#95BF47|#95bf47|#95BF46/i);
  assert.doesNotMatch(videoSection, /M8 5\.14v13\.72L19 12/);
  assert.doesNotMatch(videoSection, /h-10 w-auto max-w-full md:h-12/);

  const amazonSvg = readRepo("public/logos/platforms/amazon.svg");
  const tiktokSvg = readRepo("public/logos/platforms/tiktok.svg");
  const instagramSvg = readRepo("public/logos/platforms/instagram.svg");
  const facebookSvg = readRepo("public/logos/platforms/facebook.svg");
  const youtubeSvg = readRepo("public/logos/platforms/youtube.svg");
  assert.match(amazonSvg, /#ff6201|#FF6201/i);
  assert.match(tiktokSvg, /viewBox="0 0 1000 291/);
  assert.match(tiktokSvg, /#00F2EA|#00f2ea|#FF004F|#ff004f/i);
  assert.match(instagramSvg, /radialGradient/i);
  assert.doesNotMatch(facebookSvg, /Meta/i);
  assert.match(facebookSvg, /viewBox="0 0 40 40"/);
  assert.match(youtubeSvg, /viewBox="0 0 388/);
  assert.match(youtubeSvg, /#ff0033|#FF0033/i);

  for (const file of [
    "public/logos/platforms/amazon.svg",
    "public/logos/platforms/shopify.svg",
    "public/logos/platforms/tiktok.svg",
    "public/logos/platforms/instagram.svg",
    "public/logos/platforms/facebook.svg",
    "public/logos/platforms/youtube.svg",
  ]) {
    const svg = readRepo(file);
    assert.match(svg, /<svg/i);
    assert.doesNotMatch(svg, /SVG Repo|svgrepo|simpleicons/i);
    assert.ok(statSync(join(ROOT, file)).size > 200, file);
  }
  assert.ok(
    statSync(join(ROOT, "public/logos/platforms/mercado-libre-final.png")).size > 10_000,
  );
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

test("GTM #5 FAQ has seven localized items and the Premium production-risk guarantee", () => {
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

  const esGuarantee = es.faq.items.find((item) => item.id === "generation-not-right");
  const enGuarantee = en.faq.items.find((item) => item.id === "generation-not-right");
  assert.equal(
    esGuarantee?.question,
    "¿Y si la generación de IA sale mal, como pasa tantas veces?",
  );
  assert.equal(
    esGuarantee?.answer,
    "No es motivo de preocupación. Metaprom AI no te vende una generación de IA ni te deja con el resultado que haya salido.\n\nTú estás comprando un Comercial Premium terminado. La IA es sólo una parte de nuestro proceso de producción. Si una generación no funciona, seguimos trabajando hasta entregarte un comercial a tu satisfacción dentro del alcance del servicio contratado.\n\nY si no podemos lograrlo, te devolvemos tu dinero.",
  );
  assert.equal(
    enGuarantee?.question,
    "What if the AI generation goes wrong, like it often does?",
  );
  assert.equal(
    enGuarantee?.answer,
    "That's not something you need to worry about. Metaprom AI doesn't sell you an AI generation or leave you with whatever result happens to come out.\n\nYou're purchasing a finished Premium Commercial. AI is only one part of our production process. If a generation doesn't work, we keep working until we deliver a commercial you're satisfied with, within the scope of the service you purchased.\n\nAnd if we can't deliver it, we'll refund your money.",
  );

  const esFaq = JSON.stringify(es.faq);
  const enFaq = JSON.stringify(en.faq);
  assert.doesNotMatch(esFaq, /ilimitad|reembolso incondicional|propiedad intelectual|licencia exclusiva/i);
  assert.doesNotMatch(enFaq, /unlimited|unconditional refund|ownership|license/i);
  assert.match(readRepo("components/landing/LandingFaq.tsx"), /split\("\\n\\n"\)/);
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

test("GTM #5.1 landing videos ship lightweight posters and do not probe-download", () => {
  const video = readRepo("components/landing/CommercialVideo.tsx");
  assert.match(video, /poster/);
  assert.match(video, /lazyLoad/);
  assert.doesNotMatch(video, /document\.createElement\("video"\)/);

  const cinema = readRepo("components/landing/CinemaStage.tsx");
  assert.match(cinema, /commercialPoster/);
  assert.match(cinema, /preload=\{/);
  assert.match(readRepo("components/landing/TheReveal.tsx"), /commercialPoster/);
  assert.match(readRepo("components/landing/ShowcaseGrid.tsx"), /lazyLoad/);
  assert.match(readRepo("components/landing/Testimonials.tsx"), /commercialPoster/);

  const esContent = buildLandingContent("es", es);
  assert.equal(esContent.showcase.length, 4);
  for (const item of esContent.showcase) {
    assert.match(item.commercialPoster, /\/poster\.webp$/);
    const bytes = statSync(join(ROOT, "public", item.commercialPoster.replace(/^\//, ""))).size;
    assert.ok(bytes > 8_000, item.id);
    assert.ok(bytes < 100_000, item.id);
  }
});
