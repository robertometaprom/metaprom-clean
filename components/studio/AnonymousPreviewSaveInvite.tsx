"use client";

import GoogleSignInButton from "@/components/GoogleSignInButton";
import {
  ANONYMOUS_PREVIEW_SAVE_BODY,
  ANONYMOUS_PREVIEW_SAVE_CTA,
  ANONYMOUS_PREVIEW_SAVE_HEADLINE,
} from "@/lib/studio/anonymous-preview-save";

type AnonymousPreviewSaveInviteProps = {
  onSave: () => void;
  authRedirectTo: string;
  showSignIn?: boolean;
};

export default function AnonymousPreviewSaveInvite({
  onSave,
  authRedirectTo,
  showSignIn = false,
}: AnonymousPreviewSaveInviteProps) {
  return (
    <div
      className="rounded-2xl border border-violet-400/25 bg-violet-500/10 px-4 py-4 text-left shadow-[0_12px_40px_rgba(0,0,0,0.25)] sm:px-5 sm:py-5"
      data-testid="anonymous-preview-save-invite"
    >
      <p className="text-base font-semibold leading-snug text-white sm:text-lg">
        {ANONYMOUS_PREVIEW_SAVE_HEADLINE}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-white/75 sm:text-[15px]">
        {ANONYMOUS_PREVIEW_SAVE_BODY}
      </p>
      <div className="mt-4">
        {showSignIn ? (
          <GoogleSignInButton
            redirectTo={authRedirectTo}
            label="Continuar con Google"
          />
        ) : (
          <button
            type="button"
            onClick={onSave}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-3.5 text-base font-semibold text-white shadow-lg shadow-violet-900/40 transition hover:from-violet-600 hover:to-purple-700 active:scale-[0.98]"
            data-testid="anonymous-preview-save-cta"
          >
            {ANONYMOUS_PREVIEW_SAVE_CTA}
          </button>
        )}
      </div>
    </div>
  );
}
