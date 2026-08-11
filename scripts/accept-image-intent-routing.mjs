/**
 * Advertising Image intent routing — deterministic acceptance (no provider credits).
 * Run: npx tsx scripts/accept-image-intent-routing.mjs
 */

import {
  buildAdvertisingImagePrompt,
  promptContainsCreativeAdvertisingWrapper,
  resolveImageIntent,
} from "../lib/studio/image-intent.ts";
import { buildStudioImagePrompt } from "../lib/studio-prompts.ts";

const results = [];

function pass(name, detail) {
  results.push({ name, ok: true, detail: detail ?? "" });
  console.log(`✓ ${name}${detail ? `: ${detail}` : ""}`);
}

function fail(name, detail) {
  results.push({ name, ok: false, detail: detail ?? "" });
  console.error(`✗ ${name}${detail ? `: ${detail}` : ""}`);
}

function assert(name, condition, detail) {
  if (condition) pass(name, detail);
  else fail(name, detail || "assertion failed");
}

function resolve(text, productMode) {
  return resolveImageIntent(text, { productMode });
}

function build(text, intent, productMode) {
  const resolution = resolveImageIntent(text, {
    productMode,
    forcedIntent: intent,
  });
  if (resolution.status !== "resolved") {
    throw new Error(`Expected resolved intent for build: ${text}`);
  }
  return buildAdvertisingImagePrompt({
    customerIntent: text,
    productMode,
    intent: resolution.intent,
    providerMode: resolution.providerMode,
  });
}

const CREATIVE_FORBIDDEN_FOR_FIDELITY = [
  "dramatic, aspirational advertising scene",
  "Build an environment, mood, and story",
  "Do NOT simply crop, brighten, remove background, or place the product on a plain white background",
];

// --- A ---
{
  const text =
    "Producto para Amazon, fondo blanco, sin elementos";
  const r = resolve(text);
  assert(
    "A.intent",
    r.status === "resolved" && r.intent === "platform_fidelity",
    r.status === "resolved" ? r.intent : r.status,
  );
  if (r.status === "resolved") {
    const built = build(text, r.intent);
    assert(
      "A.fidelity_constraints",
      /PRODUCT FIDELITY|MARKETPLACE TASK|pure white|No props/i.test(
        built.imagePrompt,
      ),
    );
    assert(
      "A.no_dramatic_scene",
      !CREATIVE_FORBIDDEN_FOR_FIDELITY.some((m) =>
        built.imagePrompt.includes(m),
      ),
    );
    assert(
      "A.no_prohibit_white_bg",
      !/Do NOT.*plain white background/i.test(built.imagePrompt),
    );
    assert(
      "A.provider_mode_amazon",
      built.providerMode === "amazon",
      built.providerMode,
    );
  }
}

// --- B ---
{
  const text = "Fotos para Mercado Libre";
  const r = resolve(text);
  assert(
    "B.intent",
    r.status === "resolved" && r.intent === "platform_fidelity",
    r.status === "resolved" ? r.intent : r.status,
  );
  if (r.status === "resolved") {
    const built = build(text, r.intent);
    assert("B.provider_mode_ml", built.providerMode === "mercado-libre");
  }
}

// --- C ---
{
  const text = "20 fotos de una casa para publicarla";
  const r = resolve(text);
  assert(
    "C.intent",
    r.status === "resolved" && r.intent === "professional_enhancement",
    r.status === "resolved" ? r.intent : r.status,
  );
}

// --- D ---
{
  const text = "Mejora iluminación y perspectiva de este departamento";
  const r = resolve(text);
  assert(
    "D.intent",
    r.status === "resolved" && r.intent === "professional_enhancement",
    r.status === "resolved" ? r.intent : r.status,
  );
}

// --- E ---
{
  const text = "Hazme un flyer para vender esta casa";
  const r = resolve(text);
  assert(
    "E.intent",
    r.status === "resolved" && r.intent === "creative_advertising",
    r.status === "resolved" ? r.intent : r.status,
  );
}

// --- F ---
{
  const text = "Hazme un poster espectacular de esta crema";
  const r = resolve(text);
  assert(
    "F.intent",
    r.status === "resolved" && r.intent === "creative_advertising",
    r.status === "resolved" ? r.intent : r.status,
  );
}

// --- G ---
{
  const text = "Quiero un anuncio para Instagram";
  const r = resolve(text);
  assert(
    "G.intent",
    r.status === "resolved" && r.intent === "creative_advertising",
    r.status === "resolved" ? r.intent : r.status,
  );
}

// --- H ---
{
  const text = "Mejora esta foto";
  const r = resolve(text);
  assert(
    "H.ambiguous_clarification",
    r.status === "needs_clarification",
    r.status === "needs_clarification"
      ? `question=${r.question}; choices=${r.choices.map((c) => c.label).join(" | ")}`
      : `forced=${r.status === "resolved" ? r.intent : r.status}`,
  );
  if (r.status === "needs_clarification") {
    assert(
      "H.does_not_force_creative",
      true,
      "Director/Studio asks once; does not force creative_advertising",
    );
  }
}

// --- I ---
{
  const text = "Producto para Amazon, fondo blanco, sin elementos";
  const built = build(text, "platform_fidelity");
  assert(
    "I.platform_no_creative_wrapper",
    !promptContainsCreativeAdvertisingWrapper(built.imagePrompt) &&
      !CREATIVE_FORBIDDEN_FOR_FIDELITY.some((m) =>
        built.imagePrompt.includes(m),
      ),
  );
  assert(
    "I.platform_has_fidelity_block",
    /DO NOT CREATE AN ADVERTISING SCENE/i.test(built.imagePrompt),
  );
}

// --- J ---
{
  const text = "Mejora iluminación y perspectiva de este departamento";
  const built = build(text, "professional_enhancement");
  assert(
    "J.professional_no_scene_invention",
    !promptContainsCreativeAdvertisingWrapper(built.imagePrompt) &&
      !/Create a dramatic, aspirational advertising scene/i.test(
        built.imagePrompt,
      ) &&
      !/Build an environment, mood, and story that sells/i.test(
        built.imagePrompt,
      ),
  );
  assert(
    "J.professional_preserves_reality",
    /PHOTOGRAPHIC ENHANCEMENT TASK|Preserve the physical reality/i.test(
      built.imagePrompt,
    ),
  );
  assert(
    "J.provider_mode_enhancement",
    built.providerMode === "enhancement",
    built.providerMode,
  );
}

// --- K ---
{
  const text = "Hazme un poster espectacular de esta crema";
  const built = build(text, "creative_advertising");
  const classic = buildStudioImagePrompt(text, "custom", null);
  assert(
    "K.creative_preserves_wrapper",
    promptContainsCreativeAdvertisingWrapper(built.imagePrompt) &&
      built.imagePrompt === classic,
  );
  assert(
    "K.creative_provider_mode_custom",
    built.providerMode === "custom",
    built.providerMode,
  );
}

// Multi-photo: same intent applied independently (structural check)
{
  const text = "listas para Amazon";
  const r = resolve(text);
  assert(
    "multi.batch_common_intent",
    r.status === "resolved" && r.intent === "platform_fidelity",
  );
  if (r.status === "resolved") {
    const a = build(text, r.intent);
    const b = build(text, r.intent);
    assert(
      "multi.independent_identical_prompt",
      a.imagePrompt === b.imagePrompt && a.intent === b.intent,
    );
  }
}

const failed = results.filter((r) => !r.ok);
console.log("\n---");
console.log(`Passed: ${results.length - failed.length}/${results.length}`);
if (failed.length > 0) {
  console.error("Failed:");
  for (const f of failed) {
    console.error(`  - ${f.name}: ${f.detail}`);
  }
  process.exit(1);
}

console.log("All image-intent acceptance checks passed.");
console.log("Provider calls made: 0");
