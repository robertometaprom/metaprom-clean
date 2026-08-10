"use client";

import type { Ref } from "react";
import { ShareCommercialActions } from "@/components/share";
import type { PublicPreviewKind } from "@/lib/preview/types";
import {
  DIRECTOR_REVIEW_ADJUST_LABEL,
  DIRECTOR_REVIEW_CONTINUE_LABEL,
  DIRECTOR_REVIEW_CONTINUE_NOTE,
  DIRECTOR_REVIEW_INVITE_LINES,
  DIRECTOR_REVIEW_SHARE_HEADLINE,
  DIRECTOR_REVIEW_SHARE_LABEL,
  DIRECTOR_REVIEW_SHARE_SUPPORT,
  type DirectorReviewFocus,
} from "@/lib/studio/director-review";

type DirectorReviewInviteProps = {
  focus: DirectorReviewFocus;
  onAdjust: () => void;
  onContinue: () => void;
  /** Stable host for the shared CreativeDirectorPanel portal. */
  conversationHostRef: Ref<HTMLDivElement>;
  /** Existing public preview share target — invite tertiary action only. */
  publicPreviewUrl?: string | null;
  shareSlug?: string | null;
  /** Defaults to commercial. Advertising Image REVIEW passes advertising_image. */
  shareAssetType?: PublicPreviewKind;
};

/**
 * Deterministic REVIEW invitation — no LLM call.
 * Adjustment opens the existing Director conversation; continue keeps purchase path.
 */
export default function DirectorReviewInvite({
  focus,
  onAdjust,
  onContinue,
  conversationHostRef,
  publicPreviewUrl = null,
  shareSlug = null,
  shareAssetType = "commercial",
}: DirectorReviewInviteProps) {
  const host = (
    <div
      ref={conversationHostRef}
      className={focus === "conversation" ? "min-h-[12rem]" : "hidden"}
      aria-hidden={focus !== "conversation"}
    />
  );

  const shareZone =
    publicPreviewUrl && shareSlug ? (
      <div className="@container relative mt-2 overflow-hidden pt-7 text-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-[-20%] top-0 h-40 bg-[radial-gradient(ellipse_at_center,rgba(217,70,239,0.35)_0%,rgba(147,51,234,0.16)_42%,transparent_72%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-8 h-16 bg-[radial-gradient(ellipse_at_center,rgba(244,114,182,0.22)_0%,transparent_70%)] blur-2xl"
        />

        <p className="share-zone-headline relative w-full max-w-full px-1 text-[clamp(2.25rem,12.5cqi,3.65rem)] font-black uppercase leading-[0.92] tracking-tighter text-[#f5e9ff]">
          {DIRECTOR_REVIEW_SHARE_HEADLINE}
        </p>
        <p className="share-zone-support relative mt-3 px-2 text-[15px] font-medium italic leading-snug text-white sm:text-lg">
          {DIRECTOR_REVIEW_SHARE_SUPPORT}
        </p>

        <div className="relative mt-5">
          <ShareCommercialActions
            publicPreviewUrl={publicPreviewUrl}
            shareSlug={shareSlug}
            variant="whatsapp"
            label={DIRECTOR_REVIEW_SHARE_LABEL}
            assetType={shareAssetType}
          />
        </div>
      </div>
    ) : null;

  if (focus === "conversation") {
    return host;
  }

  if (focus === "continue") {
    return (
      <div className="space-y-4 text-left">
        {host}
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fuchsia-300/90">
          Director Creativo
        </p>
        <p className="text-sm leading-relaxed text-white/85 sm:text-[15px]">
          {DIRECTOR_REVIEW_CONTINUE_NOTE}
        </p>
        <button
          type="button"
          onClick={onAdjust}
          className="text-sm text-white/55 underline decoration-white/25 underline-offset-2 transition hover:text-white/80"
        >
          {DIRECTOR_REVIEW_ADJUST_LABEL}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-left">
      {host}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fuchsia-300/90">
          Director Creativo
        </p>
        <div className="space-y-2 text-sm leading-relaxed text-white/90 sm:text-[15px]">
          {DIRECTOR_REVIEW_INVITE_LINES.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          onClick={onAdjust}
          className="inline-flex w-full items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-4 py-3.5 text-sm font-semibold text-white transition hover:border-white/35 hover:bg-white/15"
        >
          {DIRECTOR_REVIEW_ADJUST_LABEL}
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:from-violet-600 hover:to-purple-700"
        >
          {DIRECTOR_REVIEW_CONTINUE_LABEL}
        </button>
      </div>

      {shareZone}
    </div>
  );
}
