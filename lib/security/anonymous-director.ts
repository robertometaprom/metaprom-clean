import type {
  CreativeDirectorResponse,
  ProjectContext,
} from "@/lib/creative-director/types";
import { ANON_MAX_CUSTOMER_TURNS_WITH_IMAGE } from "@/lib/security/limits";
import { projectContextHasImage } from "@/lib/security/validation";

export const ANON_DIRECTOR_UPLOAD_PROMPT =
  "Para empezar, necesito ver tu producto.\n\nSube una foto o toma una con tu cámara — con eso puedo preparar tu primera vista previa.";

export const ANON_DIRECTOR_REGISTRATION_AFTER_NO_IMAGE =
  "Para continuar necesitamos una foto de tu producto.\n\nCrea una cuenta gratuita para seguir conversando con el Director Creativo, o sube una imagen para ver tu vista previa.";

export const ANON_DIRECTOR_REGISTRATION_CONVERSATION_LIMIT =
  "Para seguir refinando tu comercial con el Director Creativo, crea una cuenta gratuita.\n\nTu vista previa te está esperando — puedes generarla ahora con la información que ya tenemos.";

export const ANON_DIRECTOR_REGISTRATION_CHAT_INSTEAD_OF_GENERATE =
  "El Director Creativo anónimo está pensado para llevarte rápido a tu primera vista previa.\n\nCrea una cuenta gratuita para continuar la conversación con más detalle.";

export type AnonymousDirectorGuardResult =
  | {
      action: "proceed";
      anonymousMode: boolean;
    }
  | {
      action: "respond";
      response: CreativeDirectorResponse;
      requiresRegistration: boolean;
    };

function countCustomerTurns(projectContext: ProjectContext | undefined): number {
  const history = projectContext?.conversationHistory ?? [];
  return history.filter((message) => message.role === "customer").length + 1;
}

function directorAlreadyAskedForImage(
  projectContext: ProjectContext | undefined,
): boolean {
  const history = projectContext?.conversationHistory ?? [];

  return history.some(
    (message) =>
      message.role === "director" &&
      /sube una foto|toma una|upload|foto de tu producto/i.test(message.content),
  );
}

export function evaluateAnonymousDirectorGuard(input: {
  isAuthenticated: boolean;
  projectContext?: ProjectContext;
}): AnonymousDirectorGuardResult {
  if (input.isAuthenticated) {
    return { action: "proceed", anonymousMode: false };
  }

  const hasImage = projectContextHasImage(input.projectContext);

  if (!hasImage) {
    if (directorAlreadyAskedForImage(input.projectContext)) {
      return {
        action: "respond",
        requiresRegistration: true,
        response: {
          message: ANON_DIRECTOR_REGISTRATION_AFTER_NO_IMAGE,
          needsClarification: false,
        },
      };
    }

    return {
      action: "respond",
      requiresRegistration: false,
      response: {
        message: ANON_DIRECTOR_UPLOAD_PROMPT,
        needsClarification: true,
        clarifyingQuestions: [
          "Sube una foto de tu producto o toma una con tu cámara para continuar.",
        ],
      },
    };
  }

  const customerTurns = countCustomerTurns(input.projectContext);

  if (customerTurns > ANON_MAX_CUSTOMER_TURNS_WITH_IMAGE) {
    return {
      action: "respond",
      requiresRegistration: true,
      response: {
        message: ANON_DIRECTOR_REGISTRATION_CONVERSATION_LIMIT,
        needsClarification: false,
      },
    };
  }

  return { action: "proceed", anonymousMode: true };
}

export function buildPostGenerationAnonymousGuard(input: {
  isAuthenticated: boolean;
  anonymousMode: boolean;
  response: CreativeDirectorResponse;
  projectContext?: ProjectContext;
}): AnonymousDirectorGuardResult | null {
  if (!input.anonymousMode || input.isAuthenticated) {
    return null;
  }

  if (input.response.proposal) {
    return null;
  }

  const customerTurns = countCustomerTurns(input.projectContext);

  if (
    input.response.needsClarification &&
    customerTurns >= ANON_MAX_CUSTOMER_TURNS_WITH_IMAGE
  ) {
    return {
      action: "respond",
      requiresRegistration: true,
      response: {
        message: ANON_DIRECTOR_REGISTRATION_CHAT_INSTEAD_OF_GENERATE,
        needsClarification: false,
      },
    };
  }

  return null;
}
