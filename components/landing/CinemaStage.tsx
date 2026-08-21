"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LandingContent } from "@/lib/i18n";
import CommercialVideo, {
  commercialRevealAfter,
  playCommercialVideo,
} from "@/components/landing/CommercialVideo";

type CinemaStageProps = {
  copy: LandingContent["cinema"];
  videos: LandingContent["showcase"];
};

const MIN_HOLD_MS = 7000;

export default function CinemaStage({
  copy,
  videos,
}: CinemaStageProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const stageRef = useRef<HTMLElement>(null);
  const activeIndexRef = useRef(0);
  const inViewRef = useRef(true);
  const transitioningRef = useRef(false);
  const settleTimerRef = useRef<number | null>(null);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  const pauseInactive = useCallback((keepIndex: number) => {
    videoRefs.current.forEach((video, index) => {
      if (!video || index === keepIndex) return;
      video.pause();
    });
  }, []);

  const playActive = useCallback((index: number) => {
    const video = videoRefs.current[index];
    if (!video || !inViewRef.current) return;
    playCommercialVideo(video);
  }, []);

  const advance = useCallback(() => {
    if (videos.length <= 1 || transitioningRef.current || !inViewRef.current) {
      return;
    }

    const current = activeIndexRef.current;
    const next = (current + 1) % videos.length;
    const nextVideo = videoRefs.current[next];
    if (!nextVideo) return;

    transitioningRef.current = true;
    const revealAfter = commercialRevealAfter(videos[next]?.commercialVideo ?? "");

    if (nextVideo.currentTime > 0.05) {
      nextVideo.currentTime = 0;
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      if (nextVideo.paused || nextVideo.readyState < 2) return;
      if (nextVideo.currentTime < revealAfter) return;
      if (
        nextVideo.parentElement?.getAttribute("data-commercial-ready") !==
        "true"
      ) {
        return;
      }

      settled = true;
      nextVideo.removeEventListener("playing", finish);
      nextVideo.removeEventListener("timeupdate", finish);
      pauseInactive(next);
      setActiveIndex(next);
      transitioningRef.current = false;
    };

    nextVideo.addEventListener("playing", finish);
    nextVideo.addEventListener("timeupdate", finish);
    playCommercialVideo(nextVideo);

    if (settleTimerRef.current !== null) {
      window.clearTimeout(settleTimerRef.current);
    }
    settleTimerRef.current = window.setTimeout(() => {
      nextVideo.removeEventListener("playing", finish);
      nextVideo.removeEventListener("timeupdate", finish);
      settleTimerRef.current = null;
      if (!settled) {
        transitioningRef.current = false;
      }
    }, 4000);
  }, [pauseInactive, videos]);

  useEffect(() => {
    return () => {
      if (settleTimerRef.current !== null) {
        window.clearTimeout(settleTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = entry.isIntersecting;
        if (entry.isIntersecting) {
          playActive(activeIndexRef.current);
        } else {
          videoRefs.current.forEach((video) => video?.pause());
        }
      },
      { threshold: 0.25 },
    );

    observer.observe(stage);
    return () => observer.disconnect();
  }, [playActive]);

  useEffect(() => {
    if (!inViewRef.current) {
      pauseInactive(-1);
      return;
    }

    playActive(activeIndex);
    pauseInactive(activeIndex);
  }, [activeIndex, pauseInactive, playActive]);

  useEffect(() => {
    if (videos.length <= 1) return;

    const timer = window.setInterval(advance, MIN_HOLD_MS);
    return () => window.clearInterval(timer);
  }, [advance, videos.length]);

  useEffect(() => {
    const video = videoRefs.current[activeIndex];
    if (!video || videos.length <= 1) return;

    const onEnded = () => advance();
    video.addEventListener("ended", onEnded);
    return () => video.removeEventListener("ended", onEnded);
  }, [activeIndex, advance, videos.length]);

  return (
    <section ref={stageRef} className="relative min-h-screen bg-black">
      <div className="absolute inset-0">
        {videos.map((item, index) => (
          <CommercialVideo
            key={item.id}
            ref={(element) => {
              videoRefs.current[index] = element;
            }}
            src={item.commercialVideo}
            poster={item.commercialPoster}
            muted
            loop={videos.length === 1}
            playsInline
            preload={
              index === activeIndex
                ? "auto"
                : index === (activeIndex + 1) % videos.length
                  ? "metadata"
                  : "none"
            }
            fullBleed
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              opacity: index === activeIndex ? 1 : 0,
              zIndex: index === activeIndex ? 1 : 0,
              filter: "brightness(1.32) contrast(1.03) saturate(1.10)",
            }}
          />
        ))}
        {/* Soft readability wash — open at the top so Hero continues into the nav */}
        <div
          className="absolute inset-0 z-[2]"
          style={{
            background: [
              "linear-gradient(to right, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.08) 38%, rgba(0,0,0,0) 70%)",
              "linear-gradient(to top, rgba(0,0,0,0.50) 0%, rgba(0,0,0,0.14) 34%, rgba(0,0,0,0) 62%)",
            ].join(", "),
          }}
        />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col justify-center px-6 pb-24 pt-24 md:px-10 md:pb-28 md:pt-28">
        <div className="mx-auto w-full max-w-5xl">
          <h1 className="max-w-3xl text-[clamp(1.75rem,4.2vw,3.25rem)] font-bold leading-[1.08] tracking-tight text-[#F5F5F0]">
            {copy.headline}
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-[#F5F5F0]/80 md:mt-6 md:text-lg">
            {copy.subheadline.includes("foto común") ? (
              <>
                Todo comenzó con una{" "}
                <span className="font-medium text-[#E8B86D]">foto común</span>{" "}
                de celular.
              </>
            ) : (
              copy.subheadline
            )}
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:items-center sm:gap-4">
            <Link
              href={copy.primaryCtaHref}
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#F97316] via-[#E11D8F] to-[#7C3AED] px-8 py-3.5 text-base font-medium text-white shadow-[0_10px_30px_rgba(225,29,143,0.28)] transition hover:brightness-110"
            >
              {copy.primaryCta}
              <span aria-hidden className="ml-2">
                →
              </span>
            </Link>
            <Link
              href={copy.secondaryCtaHref}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/35 px-8 py-3.5 text-base font-medium text-[#F5F5F0] transition hover:border-white/55 hover:bg-white/5"
            >
              {copy.secondaryCta}
              <svg
                aria-hidden
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M8 5.14v13.72L19 12 8 5.14z" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
