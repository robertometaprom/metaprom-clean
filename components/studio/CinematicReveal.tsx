"use client";



import { motion, AnimatePresence } from "framer-motion";

import { useCallback, useEffect, useRef, useState } from "react";

import MetapromInfinityLogo from "@/components/studio/MetapromInfinityLogo";

import { requestCinematicFullscreen } from "@/lib/cinematic-fullscreen";

import { formatPriceMxn } from "@/lib/pricing";



type RevealStage = "fade" | "logo" | "playback" | "offer";



type CinematicRevealProps = {

  videoUrl: string;

  priceMxn: number;

  autoSaveMessage?: string | null;

  autoSaveClickable?: boolean;

  onAutoSaveClick?: () => void;

  initialStage?: RevealStage;

  /** @deprecated Browsers drop gesture context after async generation; playback always tries unmute after muted start */

  fromUserGesture?: boolean;

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

  autoSaveClickable = true,

  onAutoSaveClick,

  initialStage = "fade",

  onUnlock,

  onCreateNew,

  onDownloadImage,

  hasPremiumImage,

}: CinematicRevealProps) {

  const [stage, setStage] = useState<RevealStage>(initialStage);

  const [showControls, setShowControls] = useState(false);

  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);

  const [videoReady, setVideoReady] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  const playbackInitiatedRef = useRef(false);



  useEffect(() => {

    document.body.style.overflow = "hidden";

    return () => {

      document.body.style.overflow = "";

      if (document.fullscreenElement) {

        void document.exitFullscreen().catch(() => undefined);

      }

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



  const enterFullscreen = useCallback(async () => {

    return requestCinematicFullscreen(containerRef.current, videoRef.current);

  }, []);



  const startPlayback = useCallback(async () => {

    if (playbackInitiatedRef.current) return;



    const video = videoRef.current;

    if (!video) return;



    playbackInitiatedRef.current = true;

    video.currentTime = 0;

    video.muted = true;

    video.volume = 1;



    void enterFullscreen();



    try {

      await video.play();

      video.muted = false;

      try {

        await video.play();

        setNeedsAudioUnlock(false);

      } catch {

        video.muted = true;

        await video.play().catch(() => undefined);

        setNeedsAudioUnlock(true);

      }

    } catch {

      try {

        video.muted = true;

        await video.play();

        setNeedsAudioUnlock(true);

      } catch {

        setNeedsAudioUnlock(true);

      }

    }



    window.setTimeout(() => setShowControls(true), CONTROLS_DELAY_MS);

  }, [enterFullscreen]);



  useEffect(() => {

    if (stage === "playback") return;

    playbackInitiatedRef.current = false;

    setShowControls(false);

    setNeedsAudioUnlock(false);

  }, [stage]);



  useEffect(() => {

    if (stage !== "playback") return;

    void enterFullscreen();

  }, [stage, enterFullscreen]);



  const handleVideoRef = useCallback(

    (node: HTMLVideoElement | null) => {

      videoRef.current = node;

      if (

        node &&

        stage === "playback" &&

        node.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA

      ) {

        void startPlayback();

      }

    },

    [stage, startPlayback],

  );



  const handleVideoCanPlay = useCallback(() => {

    setVideoReady(true);

    void startPlayback();

  }, [startPlayback]);



  const handleAudioUnlock = async () => {

    const video = videoRef.current;

    if (!video) return;



    await enterFullscreen();

    video.muted = false;

    video.volume = 1;



    try {

      await video.play();

      setNeedsAudioUnlock(false);

    } catch {

      video.muted = true;

      try {

        await video.play();

      } catch {

        // keep CTA visible

      }

    }

  };



  const handleVideoEnded = () => {

    videoRef.current?.pause();

    setStage("offer");

  };



  useEffect(() => {

    if (stage === "offer") {

      videoRef.current?.pause();

    }

  }, [stage]);



  const showAutoSaveLink =

    Boolean(autoSaveMessage) &&

    Boolean(onAutoSaveClick) &&

    autoSaveClickable;



  return (

    <div

      ref={containerRef}

      className="fixed inset-0 z-[100] bg-black text-white"

    >

      {/* Preload video — always mounted to avoid black flash */}

      <video

        ref={handleVideoRef}

        src={videoUrl}

        playsInline

        preload="auto"

        className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-700 ${

          stage === "playback"

            ? "opacity-100"

            : stage === "offer"

              ? "pointer-events-none opacity-0"

              : "pointer-events-none opacity-0"

        }`}

        onCanPlay={handleVideoCanPlay}

        onLoadedData={() => setVideoReady(true)}

        onEnded={handleVideoEnded}

      />



      {!videoReady && stage !== "offer" && (

        <div className="absolute inset-0 flex items-center justify-center bg-black">

          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-violet-400" />

        </div>

      )}



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

            key="playback-ui"

            initial={{ opacity: 0 }}

            animate={{ opacity: 1 }}

            exit={{ opacity: 0 }}

            transition={{ duration: 0.5, ease: EASE }}

            className="pointer-events-none absolute inset-0"

          >

            {needsAudioUnlock && (

              <div className="pointer-events-auto absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-black/80 via-black/40 to-transparent px-6 pb-10 pt-16">

                <button

                  type="button"

                  onClick={() => void handleAudioUnlock()}

                  className="rounded-full border border-white/25 bg-white/10 px-8 py-3.5 text-base font-semibold text-white shadow-lg backdrop-blur-md transition hover:scale-[1.02] hover:bg-white/20 active:scale-[0.98]"

                >

                  Activar sonido

                </button>

              </div>

            )}



            {showControls && (

              <button

                type="button"

                onClick={() => {

                  videoRef.current?.pause();

                  setStage("offer");

                }}

                className="pointer-events-auto absolute right-4 top-4 rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium text-white/70 backdrop-blur-sm transition hover:bg-black/55 hover:text-white"

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

            transition={{ duration: 0.8, ease: EASE }}

            className="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto bg-gradient-to-b from-black via-black to-neutral-950 px-6 py-10"

          >

            <div className="mx-auto w-full max-w-md space-y-7 text-center">

              <div className="space-y-3">

                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-300/90">

                  Tu comercial

                </p>

                <h2 className="text-3xl font-bold leading-[1.15] tracking-tight sm:text-4xl">

                  Este es solo el avance.

                  <span className="mt-1 block text-white/75">

                    La versión completa te espera.

                  </span>

                </h2>

                <p className="mx-auto max-w-sm text-[15px] leading-relaxed text-white/55">

                  Desbloquea 10–15 segundos en HD, sin marca de agua — listo para

                  publicar en cualquier plataforma.

                </p>

              </div>



              <div className="overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/50">

                <div className="relative aspect-[9/16] max-h-[32vh] w-full bg-neutral-900">

                  <video

                    src={videoUrl}

                    muted

                    loop

                    playsInline

                    autoPlay

                    className="h-full w-full object-cover"

                  />

                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">

                    <span className="rounded-lg bg-black/55 px-3 py-1.5 text-[10px] font-bold tracking-[0.2em] text-white/75 backdrop-blur-sm">

                      AVANCE · METAPROM

                    </span>

                  </div>

                </div>

                <p className="bg-white/[0.04] px-4 py-2.5 text-xs text-white/40">

                  Vista previa gratuita · La versión HD es tu comercial final

                </p>

              </div>



              <div className="space-y-4">

                <button

                  type="button"

                  onClick={onUnlock}

                  className="w-full rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 py-4 text-base font-semibold text-white shadow-lg shadow-violet-900/50 transition hover:from-violet-600 hover:to-purple-700 active:scale-[0.98]"

                >

                  Desbloquear comercial completo

                </button>

                <p className="text-2xl font-bold tracking-tight text-violet-300">

                  {formatPriceMxn(priceMxn, "es")}

                </p>

                {autoSaveMessage &&

                  (showAutoSaveLink ? (

                    <button

                      type="button"

                      onClick={onAutoSaveClick}

                      className="cursor-pointer text-xs text-violet-300/80 underline decoration-violet-300/30 underline-offset-2 transition hover:text-violet-200"

                    >

                      {autoSaveMessage}

                    </button>

                  ) : (

                    <p className="text-xs text-white/35">{autoSaveMessage}</p>

                  ))}

              </div>



              <div className="flex flex-col gap-2 border-t border-white/10 pt-5">

                {hasPremiumImage && onDownloadImage && (

                  <button

                    type="button"

                    onClick={onDownloadImage}

                    className="text-xs text-white/35 transition hover:text-white/55"

                  >

                    Descargar imagen de apoyo

                  </button>

                )}

                <button

                  type="button"

                  onClick={onCreateNew}

                  className="text-sm text-white/45 transition hover:text-white/70"

                >

                  Crear otro comercial

                </button>

              </div>

            </div>

          </motion.div>

        )}

      </AnimatePresence>

    </div>

  );

}

