"use client";

import { useEffect, useRef } from "react";
import type { PortfolioItem } from "@/lib/portfolio";

type TransformationStoryProps = {
  item: PortfolioItem;
};

function ScrollArrow() {
  return (
    <div className="flex justify-center py-10 md:py-14">
      <div className="h-12 w-px bg-white/20" aria-hidden />
    </div>
  );
}

export default function TransformationStory({ item }: TransformationStoryProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void video.play();
        } else {
          video.pause();
        }
      },
      { threshold: 0.45 },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <article className="mx-auto max-w-6xl px-6 py-24 md:py-32">
      <header className="mb-16 md:mb-20">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">
          {item.emotion}
        </p>
        <h2 className="mt-4 text-4xl font-bold tracking-tight text-[#F5F5F0] md:text-5xl">
          {item.category}
        </h2>
      </header>

      <div>
        <p className="mb-6 text-xs uppercase tracking-[0.25em] text-white/35">
          Before
        </p>
        <div className="overflow-hidden rounded-sm bg-white/[0.02]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.beforeImage}
            alt={`${item.category} before`}
            className="aspect-[4/3] w-full object-cover md:aspect-[16/10]"
          />
        </div>
      </div>

      <ScrollArrow />

      <div>
        <p className="mb-6 text-xs uppercase tracking-[0.25em] text-white/35">
          Premium
        </p>
        <div className="overflow-hidden rounded-sm bg-white/[0.02]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.premiumImage}
            alt={`${item.category} premium`}
            className="aspect-[4/3] w-full object-cover md:aspect-[16/10]"
          />
        </div>
      </div>

      <ScrollArrow />

      <div>
        <p className="mb-6 text-xs uppercase tracking-[0.25em] text-white/35">
          Commercial
        </p>
        <div className="overflow-hidden rounded-sm bg-white/[0.02]">
          <video
            ref={videoRef}
            muted
            loop
            playsInline
            className="aspect-[9/16] w-full object-cover md:aspect-[16/10]"
          >
            <source src={item.commercialVideo} type="video/mp4" />
          </video>
        </div>
      </div>
    </article>
  );
}
