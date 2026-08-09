/**
 * UX4A — Director REVIEW presentation (Commercial Preview / result moment).
 *
 * Presentation only. Conversation remains owned by CreativeDirectorPanel +
 * directorSessionKey / directorMessages. Advice ≠ generation.
 */

export const DIRECTOR_REVIEW_INVITE_LINES = [
  "¿Qué te parece?",
  "Ya tenemos una primera versión.",
  "Si quieres cambiar algo antes de finalizar, dímelo.",
] as const;

export const DIRECTOR_REVIEW_ADJUST_LABEL = "Quiero hacer un ajuste";
export const DIRECTOR_REVIEW_CONTINUE_LABEL = "Me gusta, continuar";
export const DIRECTOR_REVIEW_SHARE_HEADLINE = "¡COMPÁRTELO!";
export const DIRECTOR_REVIEW_SHARE_SUPPORT = "Presume lo que acabas de crear.";
export const DIRECTOR_REVIEW_SHARE_LABEL = "WHATSAPP · COMPARTIR AHORA";

export const DIRECTOR_REVIEW_CONTINUE_NOTE =
  "Cuando estés listo, desbloquea la versión completa.";

export type DirectorReviewFocus = "invite" | "conversation" | "continue";
