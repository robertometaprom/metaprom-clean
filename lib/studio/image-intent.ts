/**
 * Advertising Image intent routing — runtime job context only.
 * Separates marketplace fidelity / photographic enhancement / creative advertising
 * BEFORE final image prompt construction.
 */

import { buildPrompt, type Mode } from "@/lib/prompts";
import { buildStudioImagePrompt } from "@/lib/studio-prompts";

export type ImageIntent =
  | "platform_fidelity"
  | "professional_enhancement"
  | "creative_advertising";

export type ImageIntentChoice = {
  intent: ImageIntent;
  label: string;
};

export type ImageIntentResolution =
  | {
      status: "resolved";
      intent: ImageIntent;
      /** Provider Mode for /api/enhancement (reuses platform prompt infrastructure). */
      providerMode: Mode;
      acknowledgment: string;
    }
  | {
      status: "needs_clarification";
      question: string;
      choices: ImageIntentChoice[];
    };

export type AdvertisingImagePromptBuild = {
  intent: ImageIntent;
  providerMode: Mode;
  /** Final composed prompt persisted / returned to callers. */
  imagePrompt: string;
  /** Value sent as FormData aiInstructions (paired with providerMode). */
  aiInstructions: string;
  acknowledgment: string;
};

const IMAGE_INTENT_CLARIFICATION_QUESTION = "¿Qué quieres hacer con tus fotos?";

export const IMAGE_INTENT_CHOICES: ImageIntentChoice[] = [
  { intent: "platform_fidelity", label: "Publicarlas en una plataforma" },
  {
    intent: "professional_enhancement",
    label: "Mejorarlas profesionalmente",
  },
  { intent: "creative_advertising", label: "Crear publicidad" },
];

/** Positive creative-advertising wrapper markers (not mere negations). */
const CREATIVE_SCENE_MARKERS = [
  "Create a dramatic, aspirational advertising scene around the product",
  "Build an environment, mood, and story that sells the product",
  "Do NOT simply crop, brighten, remove background, or place the product on a plain white background",
  "This is NOT a photo enhancement task. The customer uploaded a casual phone photo",
] as const;

const PLATFORM_FIDELITY_PRIORITY_BLOCK = `THIS IS A PRODUCT FIDELITY / MARKETPLACE TASK.

DO NOT CREATE AN ADVERTISING SCENE.

Preserve the supplied product exactly.
Do not add any object that is not part of the supplied product.
No props.
No ingredients.
No decorative elements.
No plants or leaves unless they are part of the original product itself.
No splashes, capsules, fruit, lifestyle environment, scenery, or storytelling elements.
No invented accessories, altered packaging, invented labels, or creative reinterpretation of the product.

If a white background is requested or required by the marketplace:
PURE WHITE BACKGROUND.
Product only.
Professional catalog photograph.

Preserve packaging, logo, proportions, colors, and visible product identity as faithfully as possible.
User-specific instructions follow and must be respected unless they conflict with safety or explicit platform requirements.`;

const PROFESSIONAL_ENHANCEMENT_BASE = `THIS IS A PHOTOGRAPHIC ENHANCEMENT TASK.

Preserve the physical reality represented in the original photograph.
Improve photographic quality.
Do not redesign or materially change the subject/property.
Do not invent a new advertising scene, environment, or story.

Improve:
- light / exposure
- white balance and color correction
- contrast, clarity, sharpness
- noise reduction when needed
- perspective / lens correction when appropriate
- professional framing and presentation
- visual cleanup that does not materially alter the represented asset

For real estate / property / interiors:
- preserve architecture
- preserve room dimensions visually
- preserve windows, floors, fixtures, and permanent physical characteristics
- preserve the actual view
- do not add rooms, windows, pools, landscaping, or invented views
- the result must look like an excellent professional photograph OF THE SAME PROPERTY

Forbidden unless the user explicitly requests a creative edit:
- adding rooms or windows
- changing architecture
- enlarging spaces artificially
- changing floors or replacing permanent fixtures
- inventing pools, views, or landscaping
- adding products/objects that change what is actually being offered`;

const CREATIVE_PATTERNS: RegExp[] = [
  /\bflyer\b/i,
  /\bp[oó]ster\b/i,
  /\bposter\b/i,
  /\banuncio\b/i,
  /\bpublicidad\b/i,
  /\bcampaña\b/i,
  /\bespectacular\b/i,
  /\bpromoci[oó]n\b/i,
  /\bhero\s*image\b/i,
  /\bpieza publicitaria\b/i,
  /\binstagram\b/i,
  /\btiktok\b/i,
  /\bfacebook\b/i,
  /\bredes sociales\b/i,
  /\bsocial media\b/i,
  /\bcampaign\b/i,
];

const PLATFORM_PATTERNS: RegExp[] = [
  /\bamazon\b/i,
  /\bamz\b/i,
  /\bmercado\s*libre\b/i,
  /\bmercadolibre\b/i,
  /\bmarketplace\b/i,
  /\bshopify\b/i,
  /\be-?commerce\b/i,
  /\bfondo blanco\b/i,
  /\bwhite background\b/i,
  /\bproducto solo\b/i,
  /\bsin elementos\b/i,
  /\bsin props\b/i,
  /\bcat[aá]logo\b/i,
  /\blisting\b/i,
  /\bpara (amazon|mercado|shopify)\b/i,
];

const PROFESSIONAL_PATTERNS: RegExp[] = [
  /mejor(a|ar).*(luz|iluminaci[oó]n|perspectiva|exposici[oó]n|color|nitidez|enfoque)/i,
  /(iluminaci[oó]n|perspectiva|exposici[oó]n).*(departamento|casa|propiedad|foto)/i,
  /(fotos?|fotograf[ií]as?).*(casa|departamento|propiedad|inmueble|airbnb|hotel|restaurante|auto|coche|carro|maquinaria)/i,
  /(casa|departamento|propiedad|inmueble).*(publicar|vender|airbnb|listing)/i,
  /\b(\d+)\s*fotos?\b.*(casa|departamento|propiedad|inmueble)/i,
  /(casa|departamento|propiedad).*\b(\d+)\s*fotos?\b/i,
  /mejora(r)?.*(fotos?|fotograf[ií]as?).*(profesional|premium|publicar)/i,
  /corregir (perspectiva|exposici[oó]n|color)/i,
  /bienes ra[ií]ces/i,
  /\breal estate\b/i,
  /\bairbnb\b/i,
];

const AMBIGUOUS_PATTERNS: RegExp[] = [
  /^mejora(r)? esta foto\.?$/i,
  /^mejora(r)? (la|esta|mi) (foto|imagen)\.?$/i,
  /^mejorar (la |esta |mi )?(foto|imagen)\.?$/i,
  /^mejora(r)?\.?$/i,
  /^enhance (this |the )?(photo|image)\.?$/i,
  /^improve (this |the )?(photo|image)\.?$/i,
];

function hasMatch(input: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(input));
}

function isPlatformProviderMode(mode: Mode | null | undefined): boolean {
  return mode === "amazon" || mode === "mercado-libre" || mode === "premium";
}

/**
 * Resolve marketplace provider Mode from customer text + optional productMode.
 * Reuses existing amazon / mercado-libre / premium prompt infrastructure.
 */
export function resolvePlatformProviderMode(
  customerIntent: string,
  productMode?: Mode | null,
): Mode {
  const text = customerIntent.trim();

  if (/\bmercado\s*libre\b/i.test(text) || /\bmercadolibre\b/i.test(text)) {
    return "mercado-libre";
  }
  if (/\bamazon\b/i.test(text) || /\bamz\b/i.test(text)) {
    return "amazon";
  }
  if (productMode === "mercado-libre" || productMode === "amazon") {
    return productMode;
  }
  if (/\bshopify\b/i.test(text) || productMode === "premium") {
    return "premium";
  }
  // Generic marketplace / catalog / white-background → Amazon catalog prompt base.
  return "amazon";
}

export function acknowledgmentForImageIntent(intent: ImageIntent): string {
  switch (intent) {
    case "platform_fidelity":
      return "Perfecto. Las prepararé como fotos de catálogo para marketplace.";
    case "professional_enhancement":
      return "Perfecto. Mejoraré las fotos conservando fielmente la propiedad.";
    case "creative_advertising":
      return "Perfecto. Vamos a crear una pieza publicitaria.";
  }
}

/**
 * Director / Studio routing: determine Advertising Image output type.
 * Does not expose enum names to the customer.
 */
export function resolveImageIntent(
  customerIntent: string,
  options?: { productMode?: Mode | null; forcedIntent?: ImageIntent | null },
): ImageIntentResolution {
  if (options?.forcedIntent) {
    const intent = options.forcedIntent;
    return {
      status: "resolved",
      intent,
      providerMode: providerModeForIntent(intent, customerIntent, options.productMode),
      acknowledgment: acknowledgmentForImageIntent(intent),
    };
  }

  const text = customerIntent.trim();
  const productMode = options?.productMode ?? null;

  const creative = hasMatch(text, CREATIVE_PATTERNS);
  const platform =
    hasMatch(text, PLATFORM_PATTERNS) || isPlatformProviderMode(productMode);
  const professional = hasMatch(text, PROFESSIONAL_PATTERNS);
  const ambiguous = hasMatch(text, AMBIGUOUS_PATTERNS);

  // Explicit creative output wins over subject/industry (flyer for a house, etc.).
  if (creative) {
    return resolved("creative_advertising", text, productMode);
  }

  if (platform) {
    return resolved("platform_fidelity", text, productMode);
  }

  if (professional) {
    return resolved("professional_enhancement", text, productMode);
  }

  if (ambiguous || text.length < 12) {
    return {
      status: "needs_clarification",
      question: IMAGE_INTENT_CLARIFICATION_QUESTION,
      choices: IMAGE_INTENT_CHOICES,
    };
  }

  // Preserve prior Advertising Image default: creative commercial image.
  return resolved("creative_advertising", text, productMode);
}

function resolved(
  intent: ImageIntent,
  customerIntent: string,
  productMode?: Mode | null,
): Extract<ImageIntentResolution, { status: "resolved" }> {
  return {
    status: "resolved",
    intent,
    providerMode: providerModeForIntent(intent, customerIntent, productMode),
    acknowledgment: acknowledgmentForImageIntent(intent),
  };
}

function providerModeForIntent(
  intent: ImageIntent,
  customerIntent: string,
  productMode?: Mode | null,
): Mode {
  switch (intent) {
    case "platform_fidelity":
      return resolvePlatformProviderMode(customerIntent, productMode);
    case "professional_enhancement":
      return "enhancement";
    case "creative_advertising":
      return "custom";
  }
}

export function promptContainsCreativeAdvertisingWrapper(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  return CREATIVE_SCENE_MARKERS.some((marker) =>
    lower.includes(marker.toLowerCase()),
  );
}

export function buildPlatformFidelityInstructions(customerIntent: string): string {
  const vision = customerIntent.trim();
  return `${PLATFORM_FIDELITY_PRIORITY_BLOCK}

Customer instructions (dominant within this fidelity task):
${vision || "Prepare a clean marketplace / catalog product photograph from the supplied product image."}`;
}

export function buildProfessionalEnhancementInstructions(
  customerIntent: string,
): string {
  const vision = customerIntent.trim();
  return `${PROFESSIONAL_ENHANCEMENT_BASE}

Customer instructions (dominant within this enhancement task):
${vision || "Improve photographic quality while preserving the real subject."}

Requirements:
- Professional listing / property / asset photography quality
- Do NOT invent promotional compositions or campaign visuals
- Do NOT invent environments, mood stories, or fictional settings
- Do NOT redesign the subject into a different property or scene`;
}

/**
 * Build the Advertising Image generation prompt for a resolved intent.
 * Creative advertising reuses buildStudioImagePrompt unchanged.
 * Platform fidelity reuses Mode prompts via buildPrompt — never appends creative wrapper.
 */
export function buildAdvertisingImagePrompt(input: {
  customerIntent: string;
  productMode?: Mode | null;
  intent: ImageIntent;
  providerMode?: Mode;
}): AdvertisingImagePromptBuild {
  const customerIntent = input.customerIntent.trim();
  const acknowledgment = acknowledgmentForImageIntent(input.intent);

  if (input.intent === "creative_advertising") {
    const imagePrompt = buildStudioImagePrompt(
      customerIntent,
      input.productMode ?? "custom",
      null,
    );
    return {
      intent: input.intent,
      providerMode: "custom",
      imagePrompt,
      aiInstructions: imagePrompt,
      acknowledgment,
    };
  }

  if (input.intent === "professional_enhancement") {
    // Reuses Mode "enhancement" base via buildPrompt — never appends creative wrapper.
    const aiInstructions =
      buildProfessionalEnhancementInstructions(customerIntent);
    const imagePrompt = buildPrompt("enhancement", aiInstructions);
    return {
      intent: input.intent,
      providerMode: "enhancement",
      imagePrompt,
      aiInstructions,
      acknowledgment,
    };
  }

  // PLATFORM_FIDELITY — reuse amazon / mercado-libre / premium PROMPTS.
  const providerMode =
    input.providerMode ??
    resolvePlatformProviderMode(customerIntent, input.productMode);
  const aiInstructions = buildPlatformFidelityInstructions(customerIntent);
  const imagePrompt = buildPrompt(providerMode, aiInstructions);

  return {
    intent: "platform_fidelity",
    providerMode,
    imagePrompt,
    aiInstructions,
    acknowledgment,
  };
}

/**
 * Resolve intent (or accept forced) and build the final Advertising Image prompt.
 */
export function resolveAndBuildAdvertisingImagePrompt(input: {
  customerIntent: string;
  productMode?: Mode | null;
  forcedIntent?: ImageIntent | null;
}):
  | ({ status: "resolved" } & AdvertisingImagePromptBuild)
  | Extract<ImageIntentResolution, { status: "needs_clarification" }> {
  const resolution = resolveImageIntent(input.customerIntent, {
    productMode: input.productMode,
    forcedIntent: input.forcedIntent,
  });

  if (resolution.status === "needs_clarification") {
    return resolution;
  }

  const built = buildAdvertisingImagePrompt({
    customerIntent: input.customerIntent,
    productMode: input.productMode,
    intent: resolution.intent,
    providerMode: resolution.providerMode,
  });

  return { status: "resolved", ...built };
}
