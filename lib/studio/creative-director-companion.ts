/**
 * Studio orchestration for Creative Director Companion moments.
 *
 * Companion moments are milestone-triggered Director appearances orchestrated
 * by Studio. Conversation logic remains in CreativeDirectorPanel; the engine
 * and API are unchanged.
 */

export type CompanionMoment = "preview";

export const DIRECTOR_PRE_PRODUCTION_WELCOME =
  "Cuéntame qué quieres lograr.\n\nYo me encargaré de ayudarte a convertir esa idea en un comercial profesional.";

export const PREVIEW_COMPANION_WELCOME =
  "Revisé la primera versión de tu comercial.\n\nEn general creo que vamos por buen camino.\n\nAhora me gustaría mucho saber qué piensas antes de continuar.";

export function getCompanionWelcomeMessage(moment: CompanionMoment): string {
  switch (moment) {
    case "preview":
      return PREVIEW_COMPANION_WELCOME;
  }
}

export function getCompanionHeaderSubtitle(moment: CompanionMoment): string {
  switch (moment) {
    case "preview":
      return "Revisemos juntos tu avance antes del siguiente paso.";
  }
}
