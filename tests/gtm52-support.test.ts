/**
 * GTM #5.2 — Support form + private Resend delivery.
 *
 * Run: npm run test:gtm52
 */
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, test } from "node:test";
import { fileURLToPath } from "node:url";

import { POST as postSupport } from "../app/api/support/route.ts";
import {
  createMemoryCostControlStore,
  installCostControlStoreForTests,
} from "../lib/security/cost-control.ts";
import {
  MAX_SUPPORT_MESSAGE_LENGTH,
  SUPPORT_RATE_LIMIT,
} from "../lib/security/limits.ts";
import { SUPPORT_INTERNAL_RECIPIENT } from "../lib/support/config.ts";
import { installSupportMailerForTests } from "../lib/support/mailer.ts";
import {
  isValidSupportMessage,
  normalizeSupportMessage,
  parseSupportRequestBody,
  SUPPORT_CATEGORY_IDS,
  SUPPORT_HONEYPOT_FIELD,
} from "../lib/support/public.ts";
import type { Messages } from "../lib/i18n.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REQUEST_ID = "11111111-1111-4111-8111-111111111111";
const REQUEST_ID_B = "22222222-2222-4222-8222-222222222222";

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

const es = JSON.parse(readRepo("messages/es.json")) as Messages;
const en = JSON.parse(readRepo("messages/en.json")) as Messages;

const PUBLIC_SUPPORT_FILES = [
  "app/soporte/page.tsx",
  "app/soporte/SupportForm.tsx",
  "app/api/support/route.ts",
  "components/landing/Footer.tsx",
  "components/legal/LegalLinks.tsx",
  "components/legal/SupportFormLink.tsx",
  "components/legal/LegalPage.tsx",
  "components/legal/LegalDocument.tsx",
  "lib/legal/policies.ts",
  "app/privacidad/page.tsx",
  "app/terminos/page.tsx",
  "app/pagos-reembolsos/page.tsx",
  "messages/es.json",
  "messages/en.json",
  "lib/support/public.ts",
];

const LEAK_PATTERN =
  /robertometaprom@gmail\.com|support@metaprom\.com|NEXT_PUBLIC_RESEND|NEXT_PUBLIC_SUPPORT/i;

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    name: "Ana Lopez",
    email: "ana@example.com",
    category: "payments",
    message: "Necesito ayuda con un pago de un comercial.",
    locale: "es",
    requestId: REQUEST_ID,
    ...overrides,
  };
}

test("Support copy is bilingual and names Metaprom AI", () => {
  assert.equal(es.support.title, "Soporte");
  assert.equal(en.support.title, "Support");
  assert.equal(es.support.name, "Nombre");
  assert.equal(en.support.name, "Name");
  assert.equal(es.support.email, "Correo electrónico");
  assert.equal(en.support.email, "Email");
  assert.equal(es.support.category, "Categoría");
  assert.equal(en.support.category, "Category");
  assert.equal(es.support.message, "Mensaje");
  assert.equal(en.support.message, "Message");
  assert.match(es.support.success, /envió|enviado/i);
  assert.match(en.support.success, /sent/i);
  assert.match(es.support.lead, /Metaprom AI/);
  assert.match(en.support.lead, /Metaprom AI/);
  assert.doesNotMatch(en.support.lead, /[¿¡]|Cuéntanos|correo que indiques/);
  assert.doesNotMatch(es.support.lead, /Tell us how we can help/);
});

test("public Support UX never exposes internal or outbound mailboxes", () => {
  for (const file of PUBLIC_SUPPORT_FILES) {
    const source = readRepo(file);
    assert.doesNotMatch(source, LEAK_PATTERN, file);
  }
  assert.match(readRepo("lib/support/config.ts"), /server-only/);
  assert.match(readRepo("lib/support/config.ts"), /RESEND_API_KEY/);
  assert.match(readRepo("lib/support/config.ts"), /RESEND_EMAIL_DOMAIN/);
  assert.equal(SUPPORT_INTERNAL_RECIPIENT, "robertometaprom@gmail.com");
  assert.match(readRepo("components/landing/Footer.tsx"), /LegalLinks/);
  assert.match(readRepo("components/legal/LegalLinks.tsx"), /SUPPORT_PATH/);
  assert.match(readRepo("lib/support/public.ts"), /\/soporte/);
  assert.match(readRepo("app/soporte/SupportForm.tsx"), /SUPPORT_HONEYPOT_FIELD/);
});

test("all seven platform marks ship as local approved assets", () => {
  const marks = readRepo("lib/platform-marks.ts");
  assert.match(marks, /amazon:/);
  assert.match(marks, /mercadolibre:/);
  assert.match(marks, /shopify:/);
  assert.match(marks, /tiktok:/);
  assert.match(marks, /instagram:/);
  assert.match(marks, /facebook:/);
  assert.match(marks, /youtube:/);
  assert.match(marks, /\/logos\/platforms\/mercado-libre-final\.png/);
  assert.doesNotMatch(marks, /partner|endorsement|integrat/i);
  assert.doesNotMatch(marks, /mercado-libre\.svg|mercado-libre-dark|logo-approval-comparison/);
  for (const file of [
    "public/logos/platforms/amazon.svg",
    "public/logos/platforms/shopify.svg",
    "public/logos/platforms/tiktok.svg",
    "public/logos/platforms/instagram.svg",
    "public/logos/platforms/facebook.svg",
    "public/logos/platforms/youtube.svg",
  ]) {
    assert.ok(statSync(join(ROOT, file)).size > 200, file);
  }
  assert.ok(
    statSync(join(ROOT, "public/logos/platforms/mercado-libre-final.png")).size > 10_000,
  );
});

test("GTM #5.2 FAQ states Metaprom AI bears Premium production risk", () => {
  const esItem = es.faq.items.find((item) => item.id === "generation-not-right");
  const enItem = en.faq.items.find((item) => item.id === "generation-not-right");

  assert.equal(
    esItem?.question,
    "¿Y si la generación de IA sale mal, como pasa tantas veces?",
  );
  assert.equal(
    esItem?.answer,
    "No es motivo de preocupación. Metaprom AI no te vende una generación de IA ni te deja con el resultado que haya salido.\n\nTú estás comprando un Comercial Premium terminado. La IA es sólo una parte de nuestro proceso de producción. Si una generación no funciona, seguimos trabajando hasta entregarte un comercial a tu satisfacción dentro del alcance del servicio contratado.\n\nY si no podemos lograrlo, te devolvemos tu dinero.",
  );
  assert.equal(
    enItem?.question,
    "What if the AI generation goes wrong, like it often does?",
  );
  assert.equal(
    enItem?.answer,
    "That's not something you need to worry about. Metaprom AI doesn't sell you an AI generation or leave you with whatever result happens to come out.\n\nYou're purchasing a finished Premium Commercial. AI is only one part of our production process. If a generation doesn't work, we keep working until we deliver a commercial you're satisfied with, within the scope of the service you purchased.\n\nAnd if we can't deliver it, we'll refund your money.",
  );

  assert.match(esItem?.answer ?? "", /Comercial Premium terminado/);
  assert.match(esItem?.answer ?? "", /te devolvemos tu dinero/);
  assert.doesNotMatch(esItem?.answer ?? "", /no necesariamente es el producto terminado/);
  assert.match(enItem?.answer ?? "", /finished Premium Commercial/);
  assert.match(enItem?.answer ?? "", /refund your money/);
  assert.doesNotMatch(enItem?.answer ?? "", /not necessarily the finished product/);
  assert.match(readRepo("components/landing/LandingFaq.tsx"), /split\("\\n\\n"\)/);
});

test("GTM #5.1 video posters remain on landing video cards", () => {
  const video = readRepo("components/landing/CommercialVideo.tsx");
  assert.match(video, /poster/);
  assert.match(video, /lazyLoad/);
  assert.doesNotMatch(video, /document\.createElement\("video"\)/);
  assert.match(readRepo("components/landing/CinemaStage.tsx"), /commercialPoster/);
});

test("server-side Support validation rejects bad payloads and accepts a complete form", () => {
  assert.equal(parseSupportRequestBody(null).ok, false);
  assert.equal(parseSupportRequestBody("x").ok, false);
  assert.equal(parseSupportRequestBody(validBody({ email: "not-an-email" })).ok, false);
  assert.equal(parseSupportRequestBody(validBody({ name: "A" })).ok, false);
  assert.equal(parseSupportRequestBody(validBody({ category: "billing" })).ok, false);
  assert.equal(parseSupportRequestBody(validBody({ locale: "fr" })).ok, false);
  assert.equal(parseSupportRequestBody(validBody({ requestId: "abc" })).ok, false);
  assert.deepEqual(SUPPORT_CATEGORY_IDS, [
    "payments",
    "account",
    "production",
    "technical",
    "other",
  ]);

  const honeypot = parseSupportRequestBody(
    validBody({ [SUPPORT_HONEYPOT_FIELD]: "http://spam.test" }),
  );
  assert.equal(honeypot.ok, true);
  if (honeypot.ok) assert.equal(honeypot.honeypot, true);

  const valid = parseSupportRequestBody(validBody());
  assert.equal(valid.ok, true);
  if (valid.ok && !valid.honeypot) {
    assert.equal(valid.payload.email, "ana@example.com");
    assert.equal(valid.payload.category, "payments");
  }
});

test("Support message is optional: empty, whitespace, 1 char, and short text are valid; over 2000 is not", () => {
  assert.equal(normalizeSupportMessage(""), "");
  assert.equal(normalizeSupportMessage("   \n\t  "), "");
  assert.equal(normalizeSupportMessage("A"), "A");
  assert.equal(normalizeSupportMessage("Prueba"), "Prueba");
  assert.equal(isValidSupportMessage(""), true);
  assert.equal(isValidSupportMessage("A"), true);
  assert.equal(isValidSupportMessage("Prueba"), true);
  assert.equal(isValidSupportMessage("x".repeat(MAX_SUPPORT_MESSAGE_LENGTH)), true);
  assert.equal(isValidSupportMessage("x".repeat(MAX_SUPPORT_MESSAGE_LENGTH + 1)), false);

  const empty = parseSupportRequestBody(validBody({ message: "" }));
  assert.equal(empty.ok, true);
  if (empty.ok && !empty.honeypot) assert.equal(empty.payload.message, "");

  const whitespace = parseSupportRequestBody(validBody({ message: "   \n\t  " }));
  assert.equal(whitespace.ok, true);
  if (whitespace.ok && !whitespace.honeypot) {
    assert.equal(whitespace.payload.message, "");
  }

  const oneChar = parseSupportRequestBody(validBody({ message: "A" }));
  assert.equal(oneChar.ok, true);
  if (oneChar.ok && !oneChar.honeypot) assert.equal(oneChar.payload.message, "A");

  for (const message of ["Ayuda", "Error", "No carga", "Prueba"]) {
    const parsed = parseSupportRequestBody(validBody({ message }));
    assert.equal(parsed.ok, true, message);
  }

  const tooLong = parseSupportRequestBody(
    validBody({ message: "x".repeat(MAX_SUPPORT_MESSAGE_LENGTH + 1) }),
  );
  assert.equal(tooLong.ok, false);

  const atMax = parseSupportRequestBody(
    validBody({ message: "x".repeat(MAX_SUPPORT_MESSAGE_LENGTH) }),
  );
  assert.equal(atMax.ok, true);
});

test("client and server Support message validation stay consistent and have no minimum", () => {
  const form = readRepo("app/soporte/SupportForm.tsx");
  const shared = readRepo("lib/support/public.ts");
  const limits = readRepo("lib/security/limits.ts");

  assert.match(form, /normalizeSupportMessage/);
  assert.match(form, /isValidSupportMessage/);
  assert.doesNotMatch(form, /MIN_SUPPORT_MESSAGE_LENGTH/);
  assert.doesNotMatch(form, /trimmedMessage\.length\s*[<>]=?/);
  assert.doesNotMatch(form, /name="message"[\s\S]*required/);

  assert.match(shared, /normalizeSupportMessage/);
  assert.match(shared, /isValidSupportMessage/);
  assert.doesNotMatch(shared, /MIN_SUPPORT_MESSAGE_LENGTH/);
  assert.doesNotMatch(shared, /message\.length < /);
  assert.doesNotMatch(limits, /MIN_SUPPORT_MESSAGE_LENGTH/);
});

let sends = 0;

beforeEach(() => {
  sends = 0;
  installCostControlStoreForTests(createMemoryCostControlStore());
  installSupportMailerForTests({
    async send() {
      sends += 1;
      return { ok: true };
    },
  });
});

afterEach(() => {
  installSupportMailerForTests(null);
  installCostControlStoreForTests(null);
});

async function post(body: unknown, ip = "203.0.113.10") {
  return postSupport(
    new Request("http://localhost/api/support", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": ip,
      },
      body: JSON.stringify(body),
    }),
  );
}

test("Support endpoint delivers once, hides recipients, and returns localized codes only", async () => {
  const response = await post(validBody());
  assert.equal(response.status, 200);
  const json = (await response.json()) as Record<string, unknown>;
  assert.equal(json.ok, true);
  assert.equal(sends, 1);
  assert.doesNotMatch(JSON.stringify(json), LEAK_PATTERN);
});

test("honeypot submissions look successful and do not send mail", async () => {
  const response = await post(
    validBody({ [SUPPORT_HONEYPOT_FIELD]: "https://bot.example" }),
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).ok, true);
  assert.equal(sends, 0);
});

test("duplicate requestId or identical content does not send twice", async () => {
  const first = await post(validBody());
  const second = await post(validBody());
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(sends, 1);

  const third = await post(
    validBody({
      requestId: REQUEST_ID_B,
      name: "Other Name",
    }),
  );
  assert.equal(third.status, 200);
  assert.equal(sends, 1);
});

test("Support uses GTM #3 durable cost-control and fail-closed rate limiting", async () => {
  const route = readRepo("app/api/support/route.ts");
  assert.match(route, /enforceSupportCostControl/);
  assert.match(route, /claimIdempotencyLock/);
  assert.doesNotMatch(route, /checkRateLimit\(/);
  assert.doesNotMatch(route, /to:|from:/);

  const ip = "198.51.100.20";
  for (let i = 0; i < SUPPORT_RATE_LIMIT; i += 1) {
    const response = await post(
      validBody({
        requestId: `11111111-1111-4111-8111-1111111111${String(i).padStart(2, "0")}`,
        message: `Necesito ayuda con un pago de un comercial numero ${i}.`,
      }),
      ip,
    );
    assert.equal(response.status, 200, `allowed ${i}`);
  }

  const blocked = await post(
    validBody({
      requestId: "11111111-1111-4111-8111-111111111199",
      message: "Necesito ayuda con un pago de un comercial extra.",
    }),
    ip,
  );
  assert.equal(blocked.status, 429);
  const json = (await blocked.json()) as Record<string, unknown>;
  assert.equal(json.ok, false);
  assert.equal(json.code, "rate_limited");
  assert.doesNotMatch(JSON.stringify(json), LEAK_PATTERN);
});

test("Support API accepts empty, whitespace, 1-character, and Prueba messages", async () => {
  type Sent = { message: string };
  const delivered: Sent[] = [];
  installSupportMailerForTests({
    async send(input) {
      sends += 1;
      delivered.push({ message: input.message });
      return { ok: true };
    },
  });

  const cases = [
    { requestId: "33333333-3333-4333-8333-333333333301", email: "empty@example.com", message: "" },
    { requestId: "33333333-3333-4333-8333-333333333302", email: "spaces@example.com", message: "   \n\t  " },
    { requestId: "33333333-3333-4333-8333-333333333303", email: "one@example.com", message: "A" },
    { requestId: "33333333-3333-4333-8333-333333333304", email: "prueba@example.com", message: "Prueba" },
  ];

  for (const item of cases) {
    const response = await post(validBody(item), "203.0.113.40");
    assert.equal(response.status, 200, item.email);
    assert.equal((await response.json()).ok, true, item.email);
  }

  assert.equal(sends, 4);
  assert.deepEqual(
    delivered.map((item) => item.message),
    ["", "", "A", "Prueba"],
  );

  const tooLong = await post(
    validBody({
      requestId: "33333333-3333-4333-8333-333333333305",
      email: "toolong@example.com",
      message: "x".repeat(MAX_SUPPORT_MESSAGE_LENGTH + 1),
    }),
    "203.0.113.40",
  );
  assert.equal(tooLong.status, 400);
  assert.equal((await tooLong.json()).ok, false);
  assert.equal(sends, 4);
});

test("Support antiabuse is unchanged", () => {
  const route = readRepo("app/api/support/route.ts");
  const form = readRepo("app/soporte/SupportForm.tsx");
  const shared = readRepo("lib/support/public.ts");

  assert.match(form, /SUPPORT_HONEYPOT_FIELD/);
  assert.match(shared, /SUPPORT_HONEYPOT_FIELD/);
  assert.match(route, /enforceSupportCostControl/);
  assert.match(route, /claimIdempotencyLock/);
  assert.match(route, /supportDuplicateFingerprint/);
  assert.match(route, /getSupportMailer\(\)\.send/);
  assert.doesNotMatch(route, /checkRateLimit\(/);
  assert.equal(SUPPORT_RATE_LIMIT, 5);
  assert.equal(MAX_SUPPORT_MESSAGE_LENGTH, 2_000);
  assert.equal(SUPPORT_HONEYPOT_FIELD, "website");
});

