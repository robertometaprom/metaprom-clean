/**
 * GTM #4 — UX / mobile / language / navigation.
 *
 * Run: npm run test:gtm4
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { buildLandingContent } from "../lib/landing-content.ts";
import {
  detectLocale,
  getSafeInternalPath,
  type Messages,
} from "../lib/i18n.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

const es = JSON.parse(readRepo("messages/es.json")) as Messages;
const en = JSON.parse(readRepo("messages/en.json")) as Messages;

test("locale detection stays cookie-compatible and bilingual", () => {
  assert.equal(detectLocale(null), "en");
  assert.equal(detectLocale("es-MX,es;q=0.9,en;q=0.8"), "es");
  assert.equal(detectLocale("en-US,en;q=0.9"), "en");
  assert.equal(detectLocale("fr-FR,fr;q=0.9"), "en");
});

test("locale switcher keeps the user on a safe current route", () => {
  assert.equal(getSafeInternalPath("/studio"), "/studio");
  assert.equal(getSafeInternalPath("/login?redirect=%2Fcreditos"), "/login?redirect=/creditos");
  assert.equal(getSafeInternalPath("/planes"), "/planes");
  assert.equal(getSafeInternalPath("//evil.com"), "/");
  assert.equal(getSafeInternalPath("https://evil.com"), "/");
  assert.equal(getSafeInternalPath("/api/payments/checkout"), "/");
  assert.equal(getSafeInternalPath("/auth/callback"), "/");
  assert.equal(getSafeInternalPath(null, "/studio"), "/studio");
});

test("ES and EN chrome messages stay paired without mixing languages", () => {
  const esNav = (es as Messages).nav;
  const enNav = (en as Messages).nav;
  const esAuth = (es as Messages).auth;
  const enAuth = (en as Messages).auth;

  assert.equal(esNav.planesCta, "Ver planes y precios");
  assert.equal(enNav.planesCta, "View plans and pricing");
  assert.equal(esNav.startFree, "Crear el mío");
  assert.equal(enNav.startFree, "Create Mine");
  assert.equal(esNav.dashboard, "Estudio");
  assert.equal(enNav.dashboard, "Studio");
  assert.notEqual(enNav.dashboard, "Dashboard");
  assert.equal(esAuth.google, "Continuar con Google");
  assert.equal(enAuth.google, "Continue with Google");
  assert.doesNotMatch(enNav.signIn, /Iniciar/);
  assert.doesNotMatch(esNav.signIn, /Sign in/);
});

test("Landing primary CTA goes to Studio and pricing CTA goes to /planes", () => {
  const esContent = buildLandingContent("es", es as Messages);
  const enContent = buildLandingContent("en", en as Messages);

  assert.equal(esContent.cinema.primaryCtaHref, "/studio");
  assert.equal(enContent.cinema.primaryCtaHref, "/studio");
  assert.equal(esContent.cinema.primaryCta, "Crear el mío");
  assert.equal(enContent.cinema.primaryCta, "Create Mine");
  assert.equal(esContent.pricing.ctaHref, "/planes");
  assert.equal(enContent.pricing.ctaHref, "/planes");
  assert.equal(esContent.pricing.cta, "Ver planes y precios");
  assert.equal(enContent.pricing.cta, "View plans and pricing");
});

test("public Landing copy does not reintroduce numeric prices", () => {
  const landingFiles = [
    "messages/es.json",
    "messages/en.json",
    "components/landing/CinemaStage.tsx",
    "components/landing/PricingSection.tsx",
    "components/landing/ShowcaseGrid.tsx",
    "components/landing/TheReveal.tsx",
    "components/landing/Footer.tsx",
    "app/page.tsx",
  ];
  const pricePattern = /\$\s*\d|MXN\s*\$/;

  for (const file of landingFiles) {
    const source = readRepo(file);
    assert.equal(pricePattern.test(source), false, file);
  }
});

test("landing, studio, login, and planes expose Planes and locale switching", () => {
  const navbar = readRepo("components/Navbar.tsx");
  const authButton = readRepo("components/AuthButton.tsx");
  const studioShell = readRepo("components/studio/StudioShell.tsx");
  const loginForm = readRepo("app/login/LoginForm.tsx");
  const planes = readRepo("components/pricing/PlanesExperience.tsx");
  const localeRoute = readRepo("app/api/locale/route.ts");

  assert.match(navbar, /href="\/planes"/);
  assert.match(navbar, /LocaleSwitcher/);
  assert.match(authButton, /href="\/login"/);
  assert.match(authButton, /labels\.signInShort/);
  assert.doesNotMatch(
    authButton.slice(authButton.indexOf('href="/login"')),
    /href="\/login"[\s\S]{0,280}hidden sm:inline/,
  );
  assert.match(studioShell, /href="\/planes"/);
  assert.match(studioShell, /nav\.planesCta/);
  assert.match(studioShell, /LocaleSwitcher/);
  assert.match(loginForm, /searchParams\.get\("redirect"\)/);
  assert.match(loginForm, /LocaleSwitcher/);
  assert.match(planes, /href="\/studio"/);
  assert.match(planes, /LocaleSwitcher/);
  assert.match(localeRoute, /LOCALE_COOKIE_NAME/);
  assert.match(localeRoute, /getSafeInternalPath/);
  const middleware = readRepo("middleware.ts");
  assert.match(middleware, /isLocaleSwitch/);
  assert.match(middleware, /\/api\/locale/);
});

test("protected credit and purchase routes keep login redirect intent", () => {
  const creditos = readRepo("app/creditos/page.tsx");
  const compra = readRepo("app/planes/compra/page.tsx");
  const checkoutButton = readRepo("components/pricing/PackagePurchaseButton.tsx");
  const callback = readRepo("app/auth/callback/route.ts");
  const biblioteca = readRepo("app/biblioteca/page.tsx");

  assert.match(creditos, /login\?redirect=\$\{encodeURIComponent\("\/creditos"\)\}/);
  assert.match(compra, /login\?redirect=\$\{encodeURIComponent\("\/planes"\)\}/);
  assert.match(checkoutButton, /\/login\?redirect=\$\{encodeURIComponent\("\/planes"\)\}/);
  assert.match(callback, /searchParams\.get\("next"\)/);
  assert.match(biblioteca, /buildBibliotecaStudioUrl/);
});
