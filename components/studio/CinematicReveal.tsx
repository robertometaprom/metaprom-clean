"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import MetapromInfinityLogo from "@/components/studio/MetapromInfinityLogo";
import { formatPriceMxn } from "@/lib/pricing";

type RevealStage = "fade" | "logo" | "playback" | "offer";

type CinematicRevealProps = {
  videoUrl: string;
  priceMxn: number;
  autoSaveMessage?: string | null;
  initialStage?: RevealStage;
  onUnlock: () => void;
  onCreateNew: () => void;
  onDownloadImage?: () => void;
  hasPremiumImage?: boolean;
};

const EASE = [0.22, 1, 0.36, 1] as const;
const LOGO_DURATION_MS = 1000;
const FADE_DURATION_MS = 500;
const CONTROLS_DELAY_MS = 2500;

export default function CinematicReveal({
  videoUrl,
  priceMxn,
  autoSaveMessage,
  initialStage = "fade",
  onUnlock,
  onCreateNew,
  onDownloadImage,
  hasPremiumImage,
}: CinematicRevealProps) {
  const [stage, setStage] = useState<RevealStage>(initialStage);
  const [showControls, setShowControls] = useState(false);
  const [needsAudioTap, setNeedsAudioTap] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (initialStage === "offer") return;
    if (stage !== "fade") return;
    const timer = window.setTimeout(() => setStage("logo"), FADE_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [stage, initialStage]);

  useEffect(() => {
    if (initialStage === "offer") return;
    if (stage !== "logo") return;
    const timer = window.setTimeout(() => setStage("playback"), LOGO_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [stage, initialStage]);

  const startPlayback = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    video.muted = false;
    video.volume = 1;

    try {
      await video.play();
      setNeedsAudioTap(false);
    } catch {
      video.muted = true;
      try {
        await video.play();
        setNeedsAudioTap(true);
      } catch {
        setNeedsAudioTap(true);
      }
    }

    window.setTimeout(() => setShowControls(true), CONTROLS_DELAY_MS);
  }, []);

  useEffect(() => {
    if (stage !== "playback") return;
    void startPlayback();
  }, [stage, startPlayback]);

  const handleVideoEnded = () => {
    setStage("offer");
  };

  const handleEnableAudio = async () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = false;
    video.volume = 1;

    try {
      await video.play();
      setNeedsAudioTap(false);
    } catch {
      // Browser blocked — user may need another tap
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white">
      <AnimatePresence mode="wait">
        {(stage === "fade" || stage === "logo") && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: FADE_DURATION_MS / 1000, ease: EASE }}
            className="absolute inset-0 flex items-center justify-center bg-black"
          >
            {stage === "logo" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.04 }}
                transition={{ duration: 0.45, ease: EASE }}
              >
                <MetapromInfinityLogo size={88} />
              </motion.div>
            )}
          </motion.div>
        )}

        {stage === "playback" && (
          <motion.div
            key="playback"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="absolute inset-0 bg-black"
          >
            <video
              ref={videoRef}
              src={videoUrl}
              playsInline
              className="h-full w-full object-contain"
              onEnded={handleVideoEnded}
            />

            {needsAudioTap && (
              <button
                type="button"
                onClick={handleEnableAudio}
                className="absolute inset-x-0 bottom-24 mx-auto w-fit rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/20"
              >
                Toca para activar el audio
              </button>
            )}

            {showControls && (
              <button
                type="button"
                onClick={() => setStage("offer")}
                className="absolute right-4 top-4 rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium text-white/70 backdrop-blur-sm transition hover:text-white"
              >
                Saltar
              </button>
            )}
          </motion.div>
        )}

        {stage === "offer" && (
          <motion.div
            key="offer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black px-6"
          >
            <div className="mx-auto w-full max-w-md space-y-8 text-center">
              <div className="space-y-3">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-violet-300/80">
                  Tu comercial
                </p>
                <h2 className="text-3xl font-bold leading-tight sm:text-4xl">
                  ¿Quieres verlo sin límites?
                </h2>
                <p className="text-base text-white/60">
                  Desbloquea la versión completa: 10–15 segundos en HD, sin marca
                  de agua, listo para publicar.
                </p>
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/10">
                <div className="relative aspect-[9/16] max-h-[36vh] w-full bg-neutral-900">
                  <video
                    src={videoUrl}
                    muted
                    loop
                    playsInline
                    autoPlay
                    className="h-full w-full object-cover opacity-80"
                  />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="rounded-lg bg-black/50 px-3 py-1.5 text-[10px] font-bold tracking-[0.2em] text-white/80 backdrop-blur-sm">
                      METAPROM
                    </span>
                  </div>
                </div>
                <p className="bg-white/5 px-4 py-2 text-xs text-white/45">
                  Avance gratuito · 3–5 segundos · calidad media
                </p>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={onUnlock}
                  className="w-full rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 py-4 text-base font-semibold text-white shadow-lg shadow-violet-900/40 transition hover:from-violet-600 hover:to-purple-700"
                >
                  Desbloquea el comercial completo
                </button>
                <p className="text-2xl font-bold text-violet-300">
                  {formatPriceMxn(priceMxn, "es")}
                </p>
                {autoSaveMessage && (
                  <p className="text-xs text-white/40">{autoSaveMessage}</p>
                )}
              </div>

              <div className="flex flex-col gap-2 pt-2">
                {hasPremiumImage && onDownloadImage && (
                  <button
                    type="button"
                    onClick={onDownloadImage}
                    className="text-sm text-white/45 transition hover:text-white/70"
                  >
                    Descargar imagen premium
                  </button>
                )}
                <button
                  type="button"
                  onClick={onCreateNew}
                  className="text-sm text-white/45 transition hover:text-white/70"
                >
                  Crear algo nuevo
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
