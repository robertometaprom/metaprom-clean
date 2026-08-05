"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ProtectedPreviewVideo from "@/components/preview/ProtectedPreviewVideo";
import PublicPreviewStreamError from "@/components/public/states/PublicPreviewStreamError";

type PublicCommercialVideoProps = {
  streamPath: string;
  posterUrl?: string | null;
  title: string;
  labels: {
    loadingLabel: string;
    streamErrorLabel: string;
    unmuteLabel: string;
    playLabel: string;
  };
};

type PlaybackState = "loading" | "ready" | "paused" | "error";

export default function PublicCommercialVideo({
  streamPath,
  posterUrl,
  title,
  labels,
}: PublicCommercialVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioUnlockedRef = useRef(false);
  const [playbackState, setPlaybackState] = useState<PlaybackState>("loading");
  const [isMuted, setIsMuted] = useState(true);
  const [showUnmuteHint, setShowUnmuteHint] = useState(false);

  const attemptAutoplay = useCallback(async () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (audioUnlockedRef.current) {
      setPlaybackState("ready");
      return;
    }

    video.muted = true;
    setIsMuted(true);

    try {
      await video.play();
      setPlaybackState("ready");
      setShowUnmuteHint(true);
    } catch {
      setPlaybackState("paused");
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    audioUnlockedRef.current = false;
    if (video && video.readyState >= 2) {
      setPlaybackState("ready");
      setShowUnmuteHint(true);
      setIsMuted(true);
    } else {
      setPlaybackState("loading");
      setShowUnmuteHint(false);
      setIsMuted(true);
    }
  }, [streamPath]);

  const handleCanPlay = () => {
    void attemptAutoplay();
  };

  const handlePlay = () => {
    setPlaybackState("ready");
  };

  const handlePause = () => {
    if (playbackState !== "loading" && playbackState !== "error") {
      setPlaybackState("paused");
    }
  };

  const handleError = () => {
    setPlaybackState("error");
  };

  const handleManualPlay = async () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    try {
      await video.play();
      setPlaybackState("ready");
    } catch {
      setPlaybackState("paused");
    }
  };

  const handleUnmute = async () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.defaultMuted = false;
    video.muted = false;
    video.volume = 1;
    setIsMuted(false);

    try {
      await video.play();
      audioUnlockedRef.current = true;
      setShowUnmuteHint(false);
    } catch {
      video.muted = true;
      setIsMuted(true);
      setShowUnmuteHint(true);
    }
  };

  if (playbackState === "error") {
    return <PublicPreviewStreamError message={labels.streamErrorLabel} />;
  }

  return (
    <div className="relative w-full overflow-hidden bg-black">
      {playbackState === "loading" ? (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/80"
          aria-live="polite"
        >
          <p className="text-sm text-white/50">{labels.loadingLabel}</p>
        </div>
      ) : null}

      <ProtectedPreviewVideo
        ref={videoRef}
        src={streamPath}
        poster={posterUrl ?? undefined}
        title={title}
        aria-label={title}
        className="aspect-[9/16] h-auto w-full bg-black object-contain md:aspect-video"
        autoPlay
        muted={isMuted}
        loop
        playsInline
        preload="auto"
        onLoadedData={handleCanPlay}
        onCanPlay={handleCanPlay}
        onPlay={handlePlay}
        onPause={handlePause}
        onError={handleError}
      />

      {playbackState === "paused" ? (
        <button
          type="button"
          onClick={() => void handleManualPlay()}
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/35 text-sm font-medium text-[#F5F5F0]"
          aria-label={labels.playLabel}
        >
          {labels.playLabel}
        </button>
      ) : null}

      {showUnmuteHint && isMuted && playbackState === "ready" ? (
        <button
          type="button"
          onClick={() => void handleUnmute()}
          className="absolute bottom-6 left-1/2 z-30 flex min-h-12 w-[min(92%,20rem)] -translate-x-1/2 items-center justify-center gap-2.5 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black shadow-[0_4px_24px_rgba(0,0,0,0.45)] md:bottom-5 md:min-h-11 md:w-auto md:px-5 md:text-[13px]"
          aria-label="Toca para activar sonido"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5 shrink-0 md:h-4 md:w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 5L6 9H3v6h3l5 4V5z" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
          <span>Toca para activar sonido</span>
        </button>
      ) : null}
    </div>
  );
}
