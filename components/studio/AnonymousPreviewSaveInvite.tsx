"use client";

import NewUserHandoff from "@/components/studio/NewUserHandoff";
import PreviewSaveEmailAuthLink from "@/components/studio/PreviewSaveEmailAuthLink";
import {
  ANONYMOUS_PREVIEW_SAVE_BODY,
  ANONYMOUS_PREVIEW_SAVE_HEADLINE,
} from "@/lib/studio/anonymous-preview-save";

type AnonymousPreviewSaveInviteProps = {
  /** Persist draft then NewUserHandoff initiates Google OAuth (single tap). */
  persistDraft: () => Promise<string>;
  emailAuthLabel?: string;
  emailAuthPreparingLabel?: string;
  emailAuthErrorLabel?: string;
};

export default function AnonymousPreviewSaveInvite({
  persistDraft,
  emailAuthLabel = "Continuar con email",
  emailAuthPreparingLabel = "Preparando tu comercial...",
  emailAuthErrorLabel = "No pudimos preparar tu comercial. Intenta de nuevo.",
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
        <NewUserHandoff persistDraft={persistDraft} />
        <PreviewSaveEmailAuthLink
          persistDraft={persistDraft}
          label={emailAuthLabel}
          preparingLabel={emailAuthPreparingLabel}
          errorLabel={emailAuthErrorLabel}
        />
      </div>
    </div>
  );
}
