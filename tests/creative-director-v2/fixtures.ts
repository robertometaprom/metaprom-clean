/**
 * Director V2 fixture data — replay harness inputs and expected shapes.
 */
import type { CommercialProposal } from "../../lib/creative-director/types.ts";
import type { DirectorV2CreativeBrief } from "../../lib/creative-director-v2/types.ts";

// --- Pelvic-chair / Dra. Maricruz ---

export const PELVIC_VISUAL_EVENTS = [
  "A doctor enters the medical office with a woman aged approximately 55–60.",
  "The doctor guides the woman to the pelvic chair.",
  "The woman sits in the pelvic chair.",
] as const;

export const PELVIC_NARRATION =
  "Mejora los problemas de incontinencia y recupera tu seguridad con la silla pélvica.";

export const CLINIC_FONCIONAL =
  "CLINICA GINECOESTETICA Y FONCIONAL Dra. Maricruz Barraza";
export const CLINIC_FUNCIONAL =
  "CLINICA GINECOESTETICA Y FUNCIONAL Dra. Maricruz Barraza";

export const PELVIC_INITIAL_REQUEST = [
  "A doctor enters a medical office with a 55–60 year-old woman and seats her in a pelvic chair.",
  `Narration: "${PELVIC_NARRATION}"`,
  `Final graphic: "${CLINIC_FONCIONAL}"`,
].join(" ");

export function pelvicCreativeBrief(headline: string): DirectorV2CreativeBrief {
  return {
    summary:
      "Medical-office commercial: a doctor seats a woman in a pelvic chair.",
    openingHook: PELVIC_VISUAL_EVENTS[0],
    productHeroMoment: "The woman sits in the pelvic chair.",
    emotionalTone: "professional reassurance",
    pacing: "calm 8-second clinic rhythm",
    callToAction: "Agenda tu cita",
    narrative:
      "A doctor enters the medical office with a woman aged approximately 55–60, guides her to the pelvic chair, and she sits. Overlay carries the clinic legend.",
    visualEvents: [...PELVIC_VISUAL_EVENTS],
    spokenCopy: PELVIC_NARRATION,
    promotionalOverlay: {
      headline,
      call_to_action: "Agenda tu cita",
      timing_or_layout: "bottom_outro",
    },
    sourceImageFidelity: "protected",
    overlayStyle: {
      typography_treatment: "refined",
      palette_preset: "light",
      text_alignment: "center",
      cta_treatment: "text_only",
      promotion_treatment: "emphasis",
      origin: "user",
    },
  };
}

export function pelvicExpectedProposal(headline: string): CommercialProposal {
  const brief = pelvicCreativeBrief(headline);
  return {
    summary: brief.summary,
    openingHook: brief.openingHook,
    productHeroMoment: brief.productHeroMoment,
    emotionalTone: brief.emotionalTone,
    pacing: brief.pacing,
    callToAction: brief.callToAction,
    narrative: brief.narrative,
    requiredNarrativeBeats: [...PELVIC_VISUAL_EVENTS],
    visualGenerationIntent: [
      ...PELVIC_VISUAL_EVENTS,
      `Only the designated speaker says the exact phrase once: "${PELVIC_NARRATION}". All other visible people remain silent. No other speech, dialogue, chanting, murmuring, vocal reactions, improvised words, or vocalizations. Normal non-vocal music, ambience, and sound effects remain allowed.`,
      PELVIC_NARRATION,
    ].join(" "),
    productionProfile: {
      fidelity_class: "protected",
      preserve_product_identity: true,
      protected_reasons: ["packaging", "label", "logo", "typography"],
      veo_copy_policy: "deterministic_overlay_only",
    },
    promotionalOverlays: {
      headline,
      call_to_action: "Agenda tu cita",
      timing_or_layout: "bottom_outro",
    },
    overlayStyle: {
      typography_treatment: "refined",
      palette_preset: "light",
      text_alignment: "center",
      cta_treatment: "text_only",
      promotion_treatment: "emphasis",
      origin: "user",
    },
  };
}

// --- La Perla de Oro / Baja fish tacos ---

export const PERLA_VISUAL_EVENTS = [
  "Fresh Baja-style fish tacos are plated with lime and salsa on a wooden board.",
  "The tacos are presented at a beach-side table at La Perla de Oro.",
  "A customer takes the first bite of a fish taco.",
] as const;

export const PERLA_NARRATION =
  "Los mejores tacos de pescado estilo Baja, directo al mar.";

export const PERLA_HEADLINE = "La Perla de Oro — Tacos de Pescado Baja";

export const PERLA_REQUEST = [
  "Comercial TikTok para La Perla de Oro, restaurante de tacos de pescado estilo Baja.",
  "Mostrar los tacos recién servidos y alguien probándolos.",
  `Narración exacta: "${PERLA_NARRATION}"`,
  `Overlay: "${PERLA_HEADLINE}"`,
].join(" ");

export const PERLA_CREATIVE_BRIEF: DirectorV2CreativeBrief = {
  summary: "TikTok commercial for Baja fish tacos at La Perla de Oro.",
  openingHook: PERLA_VISUAL_EVENTS[0],
  productHeroMoment: "A customer takes the first bite of a fish taco.",
  emotionalTone: "fresh coastal appetite",
  pacing: "energetic TikTok rhythm",
  callToAction: "Visítanos hoy",
  narrative:
    "Fresh Baja fish tacos are plated and enjoyed at La Perla de Oro with the exact narration and overlay.",
  visualEvents: [...PERLA_VISUAL_EVENTS],
  spokenCopy: PERLA_NARRATION,
  promotionalOverlay: {
    headline: PERLA_HEADLINE,
    call_to_action: "Visítanos hoy",
    timing_or_layout: "bottom_outro",
  },
  sourceImageFidelity: "flexible",
  overlayStyle: {
    typography_treatment: "bold",
    palette_preset: "warm",
    text_alignment: "center",
    cta_treatment: "pill",
    promotion_treatment: "emphasis",
    origin: "user",
  },
};

// --- Villagio restaurant ---

export const VILLAGIO_VISUAL_EVENTS = [
  "Guests enter the Villagio restaurant through the front door.",
  "Guests are seated at a table inside the restaurant.",
  "A plate of spaghetti is served and shown prominently.",
  "A plate of lasagna is served and shown prominently.",
] as const;

export const VILLAGIO_NARRATION =
  "En Villagio, cada platillo es una experiencia que vale la pena compartir.";

export const VILLAGIO_HEADLINE = "Villagio Ristorante";
export const VILLAGIO_ADDRESS = "Av. Revolución 1234, Tijuana, B.C.";
export const VILLAGIO_PHONE = "664-555-0123";

export const VILLAGIO_REQUEST = [
  "Comercial TikTok vertical 9:16 para Villagio Ristorante.",
  "Usar la foto del restaurante con máxima fidelidad.",
  "Secuencia: entran personas, se sientan, se sirve espagueti, se sirve lasagna.",
  `Narración exacta: "${VILLAGIO_NARRATION}"`,
  `Overlay: "${VILLAGIO_HEADLINE}"`,
  `Dirección exacta: ${VILLAGIO_ADDRESS}`,
  `Teléfono de reservaciones: ${VILLAGIO_PHONE}`,
].join(" ");

export const VILLAGIO_CREATIVE_BRIEF: DirectorV2CreativeBrief = {
  summary: "TikTok commercial for Villagio Ristorante with full dining sequence.",
  openingHook: VILLAGIO_VISUAL_EVENTS[0],
  productHeroMoment: "A plate of lasagna is served and shown prominently.",
  emotionalTone: "warm Italian hospitality",
  pacing: "energetic TikTok 9:16 rhythm",
  callToAction: "Reserva tu mesa",
  narrative: `Guests enter Villagio, sit down, and enjoy spaghetti and lasagna. Overlay shows ${VILLAGIO_HEADLINE}, ${VILLAGIO_ADDRESS}, and ${VILLAGIO_PHONE}.`,
  visualEvents: [...VILLAGIO_VISUAL_EVENTS],
  spokenCopy: VILLAGIO_NARRATION,
  promotionalOverlay: {
    headline: VILLAGIO_HEADLINE,
    call_to_action: "Reserva tu mesa",
    url: VILLAGIO_ADDRESS,
    phone: VILLAGIO_PHONE,
    timing_or_layout: "bottom_outro",
  },
  sourceImageFidelity: "protected",
  overlayStyle: {
    typography_treatment: "refined",
    palette_preset: "warm",
    text_alignment: "center",
    cta_treatment: "panel",
    promotion_treatment: "badge",
    origin: "user",
  },
};

// --- Natural complete brief (bakery) ---

export const BAKERY_VISUAL_EVENTS = [
  "A bakery owner photographs a pastry box with her phone",
  "She uploads the photo",
  "The photo transforms into a professional advertisement",
] as const;

export const BAKERY_CREATIVE_BRIEF: DirectorV2CreativeBrief = {
  summary: "A bakery owner turns a pastry box photo into a campaign.",
  openingHook: BAKERY_VISUAL_EVENTS[0],
  productHeroMoment: BAKERY_VISUAL_EVENTS[2],
  emotionalTone: "warm confidence",
  pacing: "brisk and clear",
  callToAction: "Conoce más",
  narrative:
    "A bakery owner photographs a pastry box with her phone, uploads it, and watches it become a professional advertisement.",
  visualEvents: [...BAKERY_VISUAL_EVENTS],
  promotionalOverlay: {
    headline: "Hazlo extraordinario",
    call_to_action: "Conoce más",
    url: "https://metaprom.com",
    timing_or_layout: "top_intro",
  },
  sourceImageFidelity: "protected",
  overlayStyle: {
    typography_treatment: "cinematic",
    palette_preset: "warm",
    text_alignment: "left",
    cta_treatment: "panel",
    promotion_treatment: "badge",
    origin: "user",
  },
};

export const BAKERY_REQUEST =
  "Quiero un comercial para mi panadería: la dueña fotografía una caja de pasteles, la sube y se convierte en un anuncio profesional. Overlay: Hazlo extraordinario.";

// --- Incomplete brief ---

export const INCOMPLETE_REQUEST = "Quiero un comercial";

export const INCOMPLETE_CLARIFICATION = {
  message: "¿Qué producto o servicio quieres promover y en qué plataforma lo publicarás?",
  needsClarification: true,
  clarifyingQuestion:
    "¿Qué producto o servicio quieres promover y en qué plataforma lo publicarás?",
};

// --- Internal language leak (must be blocked) ---

export const LEAKING_PROVIDER_RESPONSE = {
  message:
    "Tu requiredNarrativeBeats no incluye visualGenerationIntent correctamente.",
  needsClarification: false,
  creative: pelvicCreativeBrief(CLINIC_FONCIONAL),
};
