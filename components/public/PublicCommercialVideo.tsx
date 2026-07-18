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
  const [playbackState, setPlaybackState] = useState<PlaybackState>("loading");
  const [isMuted, setIsMuted] = useState(true);
  const [showUnmuteHint, setShowUnmuteHint] = useState(false);

  const attemptAutoplay = useCallback(async () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.muted = true;
    setIsMuted(true);

    try {
      await video.play();
      setPlaybackState("ready");
      setShowUnmuteHint(true);

      video.muted = false;
      setIsMuted(false);

      try {
        await video.play();
        setShowUnmuteHint(false);
      } catch {
        video.muted = true;
        setIsMuted(true);
      }
    } catch {
      setPlaybackState("paused");
    }
  }, []);

  useEffect(() => {
    setPlaybackState("loading");
    setShowUnmuteHint(false);
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

    video.muted = false;
    setIsMuted(false);

    try {
      await video.play();
      setShowUnmuteHint(false);
    } catch {
      video.muted = true;
      setIsMuted(true);
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
        muted
        loop
        playsInline
        preload="auto"
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
          className="absolute bottom-4 right-4 z-20 rounded-full border border-white/20 bg-black/60 px-4 py-2 text-xs font-medium text-[#F5F5F0] backdrop-blur-sm"
        >
          {labels.unmuteLabel}
        </button>
      ) : null}
    </div>
  );
}
