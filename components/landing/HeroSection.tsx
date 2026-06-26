"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { LandingCopy } from "@/lib/portfolio";
import type { PortfolioItem } from "@/lib/portfolio";

type HeroSectionProps = {
  copy: LandingCopy["hero"];
  videos: PortfolioItem[];
};

const CROSSFADE_MS = 2000;
const INTERVAL_MS = 7000;

export default function HeroSection({ copy, videos }: HeroSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (videos.length <= 1) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % videos.length);
    }, INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [videos.length]);

  return (
    <section className="relative flex min-h-screen items-end overflow-hidden bg-black">
      <div className="absolute inset-0">
        {videos.map((item, index) => (
          <video
            key={item.id}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 h-full w-full object-cover transition-opacity ease-in-out"
            style={{
              opacity: index === activeIndex ? 1 : 0,
              transitionDuration: `${CROSSFADE_MS}ms`,
            }}
          >
            <source src={item.commercialVideo} type="video/mp4" />
          </video>
        ))}
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-24 pt-40 md:pb-32 md:pt-48">
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
      </div>
    </section>
  );
}
