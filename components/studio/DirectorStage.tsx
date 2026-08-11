"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  DIRECTOR_ARTWORK_SRC,
  DIRECTOR_TALKING_TOP_INSET_CLASS,
  PRODUCTION_BACKDROP_SRC,
  type DirectorStageMode,
} from "@/lib/studio/director-stage";

type DirectorStageProps = {
  mode: DirectorStageMode;
  children: ReactNode;
  /** Override artwork path; defaults to approved studio Director asset. */
  artworkSrc?: string;
  /** Override backdrop path; defaults to approved cinematic production image. */
  backdropSrc?: string;
  /**
   * `viewport` — full-bleed cinematic stage (generation).
   * `contained` — fills parent without breaking out (nested surfaces).
   */
  layout?: "viewport" | "contained";
  /**
   * When Biblioteca is open on desktop, shift the Director row left so the
   * interaction block clears the white panel. Mobile position unchanged.
   */
  libraryOpen?: boolean;
  className?: string;
};

/**
 * Cinematic Director + communication/work shell.
 * Presentation only — conversation/generation state stays with callers.
 * Talking mode is the same shell as working — swap children only.
 */
export default function DirectorStage({
  mode,
  children,
  artworkSrc = DIRECTOR_ARTWORK_SRC,
  backdropSrc = PRODUCTION_BACKDROP_SRC,
  layout = "viewport",
  libraryOpen = false,
  className = "",
}: DirectorStageProps) {
  const [artworkReady, setArtworkReady] = useState(false);
  const isTalking = mode === "talking";
  const shellClass =
    layout === "viewport"
      ? "relative w-screen max-w-none left-1/2 -translate-x-1/2"
      : "relative w-full";
  // Desktop + Biblioteca open: clear gap before max-w-md panel (~140px left).
  const libraryDesktopShiftClass = libraryOpen
    ? "sm:-translate-x-[200px]"
    : "";
  // Talking: clear StudioShell header + breath as one unit. Working: frozen.
  const stageRowClass = isTalking
    ? `relative mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col items-center gap-2 px-4 pb-6 ${DIRECTOR_TALKING_TOP_INSET_CLASS} sm:gap-3 sm:px-8 sm:pb-8 lg:flex-row lg:items-center lg:justify-center lg:gap-0 lg:px-6 lg:pb-10 ${libraryDesktopShiftClass}`
    : `relative mx-auto flex min-h-[min(78vh,44rem)] w-full max-w-6xl flex-col items-center gap-2 px-4 py-6 sm:min-h-[min(82vh,48rem)] sm:gap-3 sm:px-8 sm:py-8 lg:min-h-[min(86vh,52rem)] lg:flex-row lg:items-center lg:justify-center lg:gap-0 lg:px-6 lg:py-10 ${libraryDesktopShiftClass}`;
  useEffect(() => {
    let cancelled = false;
    const probe = new window.Image();
    probe.onload = () => {
      if (!cancelled) setArtworkReady(true);
    };
    probe.onerror = () => {
      if (!cancelled) setArtworkReady(false);
    };
    probe.src = artworkSrc;
    return () => {
      cancelled = true;
    };
  }, [artworkSrc]);

  return (
    <section
      aria-label={
        mode === "working"
          ? "Director Creativo produciendo"
          : "Director Creativo"
      }
      className={`${shellClass} overflow-hidden bg-[#07070c] text-white ${className}`}
    >
      {/* Full-bleed cinematic production backdrop */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative full-bleed stage backdrop */}
        <img
          src={backdropSrc}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,4,10,0.42)_0%,rgba(4,4,10,0.18)_45%,rgba(4,4,10,0.34)_100%),linear-gradient(180deg,rgba(4,4,10,0.28)_0%,rgba(4,4,10,0.12)_48%,rgba(4,4,10,0.45)_100%)]" />
      </div>

      <div className={stageRowClass}>
        {/* Director — large, composited, no image frame */}
        <div className="relative flex w-full max-w-[22rem] shrink-0 justify-center sm:max-w-[26rem] lg:max-w-[32rem] lg:basis-[48%] lg:justify-end">
          <div className="relative director-artwork-breath w-full">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-[22%] h-[58%] w-[58%] -translate-x-1/2 rounded-full bg-fuchsia-500/15 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-[14%] bottom-0 h-10 rounded-[100%] bg-black/50 blur-xl"
            />

            {artworkReady ? (
              // eslint-disable-next-line @next/next/no-img-element -- transparent PNG slot; avoid next/image layout box
              <img
                src={artworkSrc}
                alt="Director Creativo"
                className="relative z-[1] mx-auto h-auto w-full max-h-[58vh] object-contain object-bottom drop-shadow-[0_28px_56px_rgba(0,0,0,0.55)] sm:max-h-[64vh] lg:max-h-[74vh]"
              />
            ) : (
              <DirectorArtworkFallback />
            )}
          </div>
        </div>

        {/* Work / progress surface — close to Director face / upper torso */}
        <div className="relative z-[2] w-full min-w-0 flex-1 lg:-ml-6 lg:basis-[52%] lg:self-center lg:pb-10 lg:pl-0">
          <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-lg">
            <div className="director-work-surface relative px-1 py-2 sm:px-2 sm:py-3 lg:px-0 lg:py-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                  className="relative"
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Transparent-slot fallback until approved Director artwork loads. */
function DirectorArtworkFallback() {
  return (
    <div
      className="relative z-[1] mx-auto flex h-[min(58vh,24rem)] w-full max-w-[20rem] items-end justify-center sm:h-[min(64vh,28rem)] lg:h-[min(72vh,34rem)]"
      role="img"
      aria-label="Director Creativo"
    >
      <div className="relative h-full w-[78%]">
        <div className="absolute inset-x-[18%] top-[6%] aspect-square rounded-full bg-gradient-to-b from-neutral-200/90 to-neutral-400/70 shadow-[0_0_40px_rgba(167,139,250,0.35)]" />
        <div className="absolute inset-x-[8%] top-[38%] bottom-0 rounded-t-[46%] bg-gradient-to-b from-neutral-100/85 via-neutral-300/55 to-transparent" />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#07070c] to-transparent"
        />
      </div>
    </div>
  );
}

/** Slot helper for talking-mode children inside DirectorStage. */
export function DirectorTalkingSlot({ children }: { children: ReactNode }) {
  return <div className="min-h-[12rem]">{children}</div>;
}
