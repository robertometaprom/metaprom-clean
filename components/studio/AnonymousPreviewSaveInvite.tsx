"use client";

import NewUserHandoff from "@/components/studio/NewUserHandoff";
import {
  ANONYMOUS_PREVIEW_SAVE_BODY,
  ANONYMOUS_PREVIEW_SAVE_HEADLINE,
} from "@/lib/studio/anonymous-preview-save";

type AnonymousPreviewSaveInviteProps = {
  /** Persist draft then NewUserHandoff initiates Google OAuth (single tap). */
  persistDraft: () => Promise<string>;
};

export default function AnonymousPreviewSaveInvite({
  persistDraft,
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
      </div>
    </div>
  );
}
