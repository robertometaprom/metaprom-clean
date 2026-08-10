/**
 * Studio orchestration for Creative Director Companion moments.
 *
 * Companion moments are milestone-triggered Director appearances orchestrated
 * by Studio. Conversation logic remains in CreativeDirectorPanel; the engine
 * and API are unchanged.
 */

export type CompanionMoment =
  | "preview"
  | "save_invitation"
  | "generate_invitation";

export const DIRECTOR_PRE_PRODUCTION_WELCOME =
  "Hola, soy tu Director Creativo.\n\nCuéntame qué quieres crear o qué quieres vender.\nYo te ayudo a convertir la idea en una pieza publicitaria.";

/** Deterministic REVIEW opener appended to the same conversation (no LLM). */
export const PREVIEW_COMPANION_WELCOME =
  "¿Qué te parece?\n\nYa tenemos una primera versión.\n\nSi quieres cambiar algo antes de finalizar, dímelo.";

export const SAVE_INVITATION_COMPANION_MESSAGE =
  "¡Quedó muy bien!\n\nSi quieres conservar este trabajo y todos tus próximos proyectos en tu biblioteca personal, crea una cuenta gratuita. Así podrás regresar cuando quieras y continuar donde te quedaste.";

export const GENERATE_INVITATION_COMPANION_MESSAGE =
  "Guarda tu proyecto y crea tu primera Imagen Publicitaria gratis.\n\nTu idea y la conversación conmigo se conservan — al crear tu cuenta podrás generar cuando estés listo.";

export function getCompanionWelcomeMessage(moment: CompanionMoment): string {
  switch (moment) {
    case "preview":
      return PREVIEW_COMPANION_WELCOME;
    case "save_invitation":
      return SAVE_INVITATION_COMPANION_MESSAGE;
    case "generate_invitation":
      return GENERATE_INVITATION_COMPANION_MESSAGE;
  }
}

export function getCompanionHeaderSubtitle(moment: CompanionMoment): string {
  switch (moment) {
    case "preview":
      return "Revisemos juntos el resultado antes de finalizar.";
    case "save_invitation":
      return "Tu comercial está listo — créalo en tu biblioteca cuando quieras.";
    case "generate_invitation":
      return "Tu primera Imagen Publicitaria es gratis.";
  }
}
