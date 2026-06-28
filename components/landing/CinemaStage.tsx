"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LandingContent } from "@/lib/i18n";
import CommercialVideo from "@/components/landing/CommercialVideo";

type CinemaStageProps = {
  copy: LandingContent["cinema"];
  price: LandingContent["priceConfidence"];
  videos: LandingContent["showcase"];
};

const FADE_MS = 1800;
const MIN_HOLD_MS = 7000;

export default function CinemaStage({
  copy,
  price,
  videos,
}: CinemaStageProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const transitioningRef = useRef(false);

  const advance = useCallback(() => {
    if (videos.length <= 1 || transitioningRef.current) return;

    transitioningRef.current = true;
    setActiveIndex((current) => (current + 1) % videos.length);

    window.setTimeout(() => {
      transitioningRef.current = false;
    }, FADE_MS);
  }, [videos.length]);

  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) return;

      if (index === activeIndex) {
        video.currentTime = 0;
        void video.play();
      } else {
        video.pause();
      }
    });
  }, [activeIndex]);

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
    <section className="relative min-h-screen bg-black">
      <div className="absolute inset-0">
        {videos.map((item, index) => (
          <CommercialVideo
            key={item.id}
            ref={(element) => {
              videoRefs.current[index] = element;
            }}
            src={item.commercialVideo}
            autoPlay={index === 0}
            muted
            loop={videos.length === 1}
            playsInline
            preload={index <= 1 ? "auto" : "metadata"}
            fullBleed
            className="absolute inset-0 h-full w-full object-cover transition-opacity ease-in-out"
            style={{
              opacity: index === activeIndex ? 1 : 0,
              transitionDuration: `${FADE_MS}ms`,
            }}
          />
        ))}
        <div className="absolute inset-0 bg-black/45" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/50" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col justify-end px-6 pb-16 pt-32 md:px-10 md:pb-24">
        <div className="mx-auto w-full max-w-5xl">
          <h1 className="max-w-4xl text-4xl font-bold leading-[1.05] tracking-tight text-[#F5F5F0] md:text-6xl lg:text-7xl">
            {copy.headline}
          </h1>

          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-[#F5F5F0]/70 md:text-xl">
            {copy.subheadline}
          </p>

          <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link
              href={copy.primaryCtaHref}
              className="inline-flex items-center justify-center rounded-full bg-[#F5F5F0] px-8 py-4 text-base font-medium text-black transition hover:bg-white"
            >
              {copy.primaryCta}
            </Link>
            <Link
              href={copy.secondaryCtaHref}
              className="inline-flex items-center justify-center rounded-full border border-white/20 px-8 py-4 text-base font-medium text-[#F5F5F0] transition hover:border-white/40 hover:bg-white/5"
            >
              {copy.secondaryCta}
            </Link>
          </div>

          <div className="mt-16 border-t border-white/10 pt-10 md:mt-20">
            <p className="text-xs uppercase tracking-[0.35em] text-white/45">
              {price.label}
            </p>
            <p className="mt-4 text-4xl font-bold tracking-tight text-[#F5F5F0] md:text-5xl">
              {price.priceFormatted}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
