"use client";

import type { ReactNode } from "react";
import {
  DIRECTOR_ARTWORK_SRC,
  PRODUCTION_BACKDROP_SRC,
} from "@/lib/studio/director-stage";

type DirectorResultReviewProps = {
  /** Commercial preview / advertising image media column. */
  media: ReactNode;
  /** Director invite, conversation, or continue guidance. */
  director: ReactNode;
  /** Optional unlock / share / secondary actions under the media. */
  mediaFooter?: ReactNode;
  className?: string;
};

/**
 * Premium Preview ↔ Director REVIEW composition.
 * Reuses approved artwork + production backdrop; does not own conversation state.
 */
export default function DirectorResultReview({
  media,
  director,
  mediaFooter = null,
  className = "",
}: DirectorResultReviewProps) {
  return (
    <section
      aria-label="Revisión con Director Creativo"
      className={`relative flex min-h-0 w-full flex-col overflow-x-hidden bg-[#07070c] text-white lg:min-h-[100dvh] ${className}`}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative full-bleed stage backdrop */}
        <img
          src={PRODUCTION_BACKDROP_SRC}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,4,10,0.55)_0%,rgba(4,4,10,0.28)_48%,rgba(4,4,10,0.52)_100%),linear-gradient(180deg,rgba(4,4,10,0.35)_0%,rgba(4,4,10,0.18)_45%,rgba(4,4,10,0.62)_100%)]" />
      </div>

      <div className="relative z-[1] mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pb-8 pt-16 sm:gap-8 sm:px-8 sm:pb-10 sm:pt-20 lg:flex-1 lg:flex-row lg:items-stretch lg:gap-8 lg:px-6 lg:pb-10 lg:pt-24">
        {/* Preview protagonist — video + primary CTAs first on mobile */}
        <div className="flex min-w-0 flex-col justify-start lg:flex-1 lg:basis-[46%] lg:justify-center">
          <div className="mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-fuchsia-300/90">
              Vista previa
            </p>
            <div className="overflow-hidden rounded-2xl border border-white/12 bg-black/40 shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
              {media}
            </div>
            {mediaFooter ? (
              <div
                className="mt-4 space-y-4 sm:mt-5"
                data-testid="preview-media-footer"
              >
                {mediaFooter}
              </div>
            ) : null}
          </div>
        </div>

        {/* Director protagonist — same approved visual identity */}
        <div className="flex min-w-0 flex-col justify-start lg:flex-1 lg:basis-[54%] lg:justify-center">
          <div className="flex w-full flex-col items-center gap-4 sm:gap-5 lg:flex-row lg:items-center lg:gap-0">
            <div className="relative flex w-full max-w-[16rem] shrink-0 justify-center sm:max-w-[18rem] lg:max-w-[20rem] lg:basis-[42%] lg:justify-end">
              <div className="relative director-artwork-breath w-full">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 top-[22%] h-[58%] w-[58%] -translate-x-1/2 rounded-full bg-fuchsia-500/15 blur-3xl"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-[14%] bottom-0 h-10 rounded-[100%] bg-black/50 blur-xl"
                />
                {/* eslint-disable-next-line @next/next/no-img-element -- transparent PNG slot */}
                <img
                  src={DIRECTOR_ARTWORK_SRC}
                  alt="Director Creativo"
                  className="relative z-[1] mx-auto h-auto w-full max-h-[38vh] object-contain object-bottom drop-shadow-[0_28px_56px_rgba(0,0,0,0.55)] sm:max-h-[44vh] lg:max-h-[56vh]"
                />
              </div>
            </div>

            <div className="relative z-[2] w-full min-w-0 flex-1 lg:-ml-4 lg:basis-[58%] lg:self-center">
              <div className="director-work-surface relative mx-auto w-full max-w-md px-1 py-2 sm:px-2 lg:mx-0 lg:max-w-2xl lg:px-0">
                {director}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
