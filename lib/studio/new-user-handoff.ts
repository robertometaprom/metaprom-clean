/**
 * NewUserHandoff — isolated post-Preview save → auth orchestration.
 * Does not own generation, claim server logic, or Biblioteca internals.
 */

import { createClient } from "@/lib/supabase/client";
import { buildAuthRedirectUrl } from "@/lib/studio-draft/client";

export type NewUserHandoffPhase =
  | "idle"
  | "preparing"
  | "redirecting"
  | "error";

export const NEW_USER_HANDOFF_CTA = "Guardar mi comercial";
export const NEW_USER_HANDOFF_PREPARING = "Preparando tu comercial...";
export const NEW_USER_HANDOFF_REDIRECTING = "Abriendo Google...";
export const NEW_USER_HANDOFF_ERROR =
  "No pudimos preparar tu comercial. Intenta de nuevo.";

export function isNewUserHandoffBusy(phase: NewUserHandoffPhase): boolean {
  return phase === "preparing" || phase === "redirecting";
}

export function newUserHandoffButtonLabel(phase: NewUserHandoffPhase): string {
  switch (phase) {
    case "preparing":
      return NEW_USER_HANDOFF_PREPARING;
    case "redirecting":
      return NEW_USER_HANDOFF_REDIRECTING;
    case "idle":
    case "error":
    default:
      return NEW_USER_HANDOFF_CTA;
  }
}

/**
 * Existing Google/Supabase OAuth with explicit account chooser.
 * Preserves callback semantics: /auth/callback?next={redirectTo}
 */
export async function startGoogleOAuthWithAccountChooser(
  redirectTo: string,
): Promise<void> {
  const supabase = createClient();
  const callbackUrl = new URL("/auth/callback", window.location.origin);
  callbackUrl.searchParams.set("next", redirectTo);

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl.toString(),
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error) {
    throw error;
  }
}

export type ExecuteNewUserHandoffInput = {
  persistDraft: () => Promise<string>;
  startOAuth?: (redirectTo: string) => Promise<void>;
  buildRedirect?: (resumeToken: string) => string;
  onPhase?: (phase: NewUserHandoffPhase) => void;
};

/**
 * Single-tap save orchestration: prepare draft → Google OAuth.
 * Callers must block duplicate taps while preparing/redirecting.
 */
export async function executeNewUserHandoff(
  input: ExecuteNewUserHandoffInput,
): Promise<string> {
  const startOAuth =
    input.startOAuth ?? startGoogleOAuthWithAccountChooser;
  const buildRedirect = input.buildRedirect ?? buildAuthRedirectUrl;

  input.onPhase?.("preparing");
  const resumeToken = await input.persistDraft();
  const redirectTo = buildRedirect(resumeToken);

  input.onPhase?.("redirecting");
  await startOAuth(redirectTo);

  return resumeToken;
}
