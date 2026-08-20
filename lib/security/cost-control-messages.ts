/** Stable customer-facing copy for GTM #3 cost control. No provider/infra details. */

export const RATE_LIMITED_GENERATION_MESSAGE =
  "Has alcanzado temporalmente el límite de generaciones. Intenta nuevamente en unos minutos.";

export const RATE_LIMITED_CONVERSATION_MESSAGE =
  "Has alcanzado temporalmente el límite de conversación. Intenta nuevamente en unos minutos.";

export const RATE_LIMITED_ANON_DIRECTOR_MESSAGE =
  "Has alcanzado el límite de conversación anónima por ahora. Crea una cuenta gratuita para continuar.";

export const GENERATION_IN_PROGRESS_MESSAGE =
  "Tu comercial se está produciendo. Intenta de nuevo en un momento.";

export const COST_CONTROL_UNAVAILABLE_MESSAGE =
  "No pudimos completar tu solicitud. Intenta de nuevo en unos minutos.";

export const RATE_LIMITED_DRAFT_MESSAGE =
  "Demasiadas solicitudes. Espera un momento e intenta de nuevo.";

export const RATE_LIMITED_CODE = "rate_limited" as const;

export const GENERATION_IN_PROGRESS_CODE = "generation_in_progress" as const;

export const COST_CONTROL_UNAVAILABLE_CODE = "temporarily_unavailable" as const;
