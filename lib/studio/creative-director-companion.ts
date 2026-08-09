/**
 * Studio orchestration for Creative Director Companion moments.
 *
 * Companion moments are milestone-triggered Director appearances orchestrated
 * by Studio. Conversation logic remains in CreativeDirectorPanel; the engine
 * and API are unchanged.
 */

export type CompanionMoment = "preview" | "save_invitation";

export const DIRECTOR_PRE_PRODUCTION_WELCOME =
  "Hola, soy tu Director Creativo.\n\nCuéntame qué quieres crear o qué quieres vender.\nYo te ayudo a convertir la idea en una pieza publicitaria.";

export const PREVIEW_COMPANION_WELCOME =
  "Revisé la primera versión de tu comercial.\n\nEn general creo que vamos por buen camino.\n\nAhora me gustaría mucho saber qué piensas antes de continuar.";

export const SAVE_INVITATION_COMPANION_MESSAGE =
  "¡Quedó muy bien!\n\nSi quieres conservar este trabajo y todos tus próximos proyectos en tu biblioteca personal, crea una cuenta gratuita. Así podrás regresar cuando quieras y continuar donde te quedaste.";

export function getCompanionWelcomeMessage(moment: CompanionMoment): string {
  switch (moment) {
    case "preview":
      return PREVIEW_COMPANION_WELCOME;
    case "save_invitation":
      return SAVE_INVITATION_COMPANION_MESSAGE;
  }
}

export function getCompanionHeaderSubtitle(moment: CompanionMoment): string {
  switch (moment) {
    case "preview":
      return "Revisemos juntos tu avance antes del siguiente paso.";
    case "save_invitation":
      return "Tu comercial está listo — créalo en tu biblioteca cuando quieras.";
  }
}
