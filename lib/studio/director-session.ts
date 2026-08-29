import type { Locale } from "../i18n";
import {
  DIRECTOR_SESSION_MAX_USER_INTERACTIONS,
  DIRECTOR_SESSION_WARNING_AFTER_USER_INTERACTIONS,
  MAX_CONVERSATION_HISTORY_MESSAGES,
} from "../security/limits";
import type { ConversationMessage } from "../creative-director/types";

export const DIRECTOR_SESSION_LIMIT_CODE = "director_session_limit" as const;

export const DIRECTOR_GENERIC_CONTINUATION_ERROR =
  "No pude continuar la conversación. Intenta enviarlo de nuevo.";

export const DIRECTOR_SESSION_REMAINING_NOTICE_VALUES = [8, 5, 3, 1] as const;

export type DirectorSessionCopy = {
  remaining: (count: number) => string;
  limitTitle: string;
  limitBody: string;
  newSession: string;
  newSessionContext: string;
};

const SESSION_COPY: Record<Locale, DirectorSessionCopy> = {
  es: {
    remaining: (count) =>
      count === 1
        ? "Te queda 1 interacción en esta sesión de Director."
        : `Te quedan ${count} interacciones en esta sesión de Director.`,
    limitTitle: "Esta sesión de Director llegó a su límite.",
    limitBody:
      "Tu proyecto y el trabajo generado hasta ahora siguen guardados.",
    newSession: "Nueva sesión de Director",
    newSessionContext:
      "Inicia una nueva sesión para continuar trabajando con Director. La nueva sesión empieza una conversación nueva y no hereda este chat.",
  },
  en: {
    remaining: (count) =>
      count === 1
        ? "You have 1 interaction left in this Director session."
        : `You have ${count} interactions left in this Director session.`,
    limitTitle: "This Director session has reached its limit.",
    limitBody: "Your project and the work generated so far remain saved.",
    newSession: "New Director session",
    newSessionContext:
      "Start a new session to keep working with Director. A new session starts a fresh conversation and does not inherit this chat.",
  },
};

export function getDirectorSessionCopy(locale: Locale = "es"): DirectorSessionCopy {
  return SESSION_COPY[locale] ?? SESSION_COPY.es;
}

export function getDirectorSessionLocale(): Locale {
  if (typeof document === "undefined") {
    return "es";
  }

  const match = document.cookie.match(/(?:^|;\s*)locale=([^;]+)/);
  return match?.[1] === "en" ? "en" : "es";
}

export function countDirectorUserInteractions(
  messages: ReadonlyArray<{ role?: string } | null | undefined>,
): number {
  return messages.filter((message) => message?.role === "customer").length;
}

export function remainingDirectorUserInteractions(
  userInteractionCount: number,
): number {
  return Math.max(
    0,
    DIRECTOR_SESSION_MAX_USER_INTERACTIONS - userInteractionCount,
  );
}

export function getDirectorRemainingInteractionsNotice(
  userInteractionCount: number,
): number | null {
  if (
    userInteractionCount < DIRECTOR_SESSION_WARNING_AFTER_USER_INTERACTIONS ||
    userInteractionCount >= DIRECTOR_SESSION_MAX_USER_INTERACTIONS
  ) {
    return null;
  }

  return remainingDirectorUserInteractions(userInteractionCount);
}

export function isDirectorSessionLimitReached(
  userInteractionCount: number,
): boolean {
  return userInteractionCount >= DIRECTOR_SESSION_MAX_USER_INTERACTIONS;
}

export function boundConversationHistoryForModel<
  T extends Pick<ConversationMessage, "role" | "content">,
>(history: T[] | undefined): T[] | undefined {
  if (!history || history.length === 0) {
    return history;
  }

  if (history.length <= MAX_CONVERSATION_HISTORY_MESSAGES) {
    return history;
  }

  return history.slice(-MAX_CONVERSATION_HISTORY_MESSAGES);
}
