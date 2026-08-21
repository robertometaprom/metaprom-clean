"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type VideoHTMLAttributes,
} from "react";
import CommercialVideoPlaceholder from "@/components/landing/placeholders/CommercialVideoPlaceholder";

type CommercialVideoProps = Omit<
  VideoHTMLAttributes<HTMLVideoElement>,
  "children"
> & {
  src: string;
  poster?: string;
  fullBleed?: boolean;
  lazyLoad?: boolean;
  playInView?: boolean;
};

const MEDIA_FIT_CLASS = "absolute inset-0 h-full w-full object-cover";

export function commercialRevealAfter(src: string) {
  return src.includes("/restaurant/") ? 0.28 : 0;
}

export function playCommercialVideo(video: HTMLVideoElement | null) {
  if (!video) return;

  video.defaultMuted = true;
  video.muted = true;
  video.playsInline = true;
  video.setAttribute("playsinline", "true");
  video.setAttribute("webkit-playsinline", "true");

  const attempt = () => {
    const result = video.play();
    if (!result || typeof result.catch !== "function") return;

    result.catch((error: unknown) => {
      const name = error instanceof Error ? error.name : "";
      if (name === "NotAllowedError") return;
      if (name === "AbortError") {
        window.requestAnimationFrame(() => {
          if (video.paused) {
            void video.play().catch(() => {});
          }
        });
        return;
      }
      if (video.readyState >= 3) return;

      const retry = () => {
        video.removeEventListener("canplay", retry);
        void video.play().catch(() => {});
      };
      video.addEventListener("canplay", retry, { once: true });
    });
  };

  attempt();
}

const CommercialVideo = forwardRef<HTMLVideoElement, CommercialVideoProps>(
  function CommercialVideo(
    {
      src,
      poster,
      className = "",
      fullBleed = false,
      lazyLoad = false,
      playInView = false,
      preload,
      onError,
      onPlaying,
      onPause,
      onTimeUpdate,
      muted = true,
      playsInline = true,
      style,
      ...videoProps
    },
    forwardedRef,
  ) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const showVideoRef = useRef(false);
    const [failed, setFailed] = useState(false);
    const [showVideo, setShowVideo] = useState(!poster);
    const revealAfter = commercialRevealAfter(src);

    useImperativeHandle(forwardedRef, () => videoRef.current as HTMLVideoElement);

    useEffect(() => {
      showVideoRef.current = showVideo;
    }, [showVideo]);

    useEffect(() => {
      setFailed(false);
      setShowVideo(!poster);
    }, [src, poster]);

    const syncMutedInline = useCallback(
      (video: HTMLVideoElement | null) => {
        if (!video) return;
        video.defaultMuted = Boolean(muted);
        video.muted = Boolean(muted);
        video.playsInline = true;
        video.setAttribute("playsinline", "true");
        video.setAttribute("webkit-playsinline", "true");
      },
      [muted],
    );

    useEffect(() => {
      syncMutedInline(videoRef.current);
    }, [src, muted, syncMutedInline]);

    const syncDisplay = useCallback(() => {
      const video = videoRef.current;
      if (!video || !poster) return;

      if (
        showVideoRef.current &&
        revealAfter > 0 &&
        !video.paused &&
        video.currentTime < revealAfter
      ) {
        video.currentTime = revealAfter;
        return;
      }

      const readyToShow =
        !video.paused &&
        !video.ended &&
        video.readyState >= 2 &&
        video.currentTime >= revealAfter;

      if (readyToShow) {
        setShowVideo(true);
        return;
      }

      if (video.currentTime < revealAfter || video.readyState < 2) {
        setShowVideo(false);
      }
    }, [poster, revealAfter]);

    useEffect(() => {
      if (!lazyLoad) return;
      const video = videoRef.current;
      if (!video) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          video.preload =
            preload === "auto" || preload === "none" || preload === ""
              ? preload
              : "metadata";
          observer.disconnect();
        },
        { rootMargin: "240px", threshold: 0.01 },
      );

      observer.observe(wrapRef.current ?? video);
      return () => observer.disconnect();
    }, [lazyLoad, preload]);

    useEffect(() => {
      if (!playInView) return;
      const video = videoRef.current;
      const root = wrapRef.current ?? video;
      if (!video || !root) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            playCommercialVideo(video);
          } else {
            video.pause();
          }
        },
        { threshold: 0.35 },
      );

      observer.observe(root);
      return () => observer.disconnect();
    }, [playInView, src]);

    if (failed) {
      return (
        <CommercialVideoPlaceholder className={className} fullBleed={fullBleed} />
      );
    }

    const wrapperClassName = [
      "relative overflow-hidden",
      fullBleed ? "absolute inset-0 h-full w-full" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div
        ref={wrapRef}
        className={wrapperClassName}
        style={{
          ...style,
          backgroundImage: poster && !showVideo ? `url(${poster})` : undefined,
          backgroundSize: poster && !showVideo ? "cover" : undefined,
          backgroundPosition: poster && !showVideo ? "center" : undefined,
        }}
        data-commercial-ready={showVideo || !poster ? "true" : "false"}
      >
        {poster && !showVideo ? (
          <img
            src={poster}
            alt=""
            aria-hidden="true"
            draggable={false}
            decoding="async"
            className={`${MEDIA_FIT_CLASS} z-[1]`}
            style={{ objectPosition: "center" }}
          />
        ) : null}
        <video
          ref={(node) => {
            videoRef.current = node;
            syncMutedInline(node);
          }}
          preload={lazyLoad ? "none" : preload}
          muted={muted}
          playsInline={playsInline}
          {...videoProps}
          className={`${MEDIA_FIT_CLASS} z-0`}
          style={{
            objectPosition: "center",
            opacity: showVideo || !poster ? 1 : 0,
          }}
          onPlaying={(event) => {
            syncDisplay();
            onPlaying?.(event);
          }}
          onTimeUpdate={(event) => {
            syncDisplay();
            onTimeUpdate?.(event);
          }}
          onPause={(event) => {
            syncDisplay();
            onPause?.(event);
          }}
          onError={(event) => {
            setFailed(true);
            onError?.(event);
          }}
        >
          <source src={src} type="video/mp4" />
        </video>
      </div>
    );
  },
);

export default CommercialVideo;
