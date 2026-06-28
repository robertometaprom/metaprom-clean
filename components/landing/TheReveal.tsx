"use client";

import { useEffect, useRef } from "react";
import type { LandingContent } from "@/lib/i18n";
import PortfolioImage from "@/components/landing/PortfolioImage";
import CommercialVideo from "@/components/landing/CommercialVideo";

type TheRevealProps = {
  item: LandingContent["featured"];
  labels: LandingContent["reveal"];
};

function FlowDivider() {
  return (
    <div className="flex justify-center py-12 md:py-16">
      <div className="h-14 w-px bg-white/15" aria-hidden />
    </div>
  );
}

export default function TheReveal({ item, labels }: TheRevealProps) {
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
      { threshold: 0.4 },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="reveal" className="mx-auto max-w-7xl px-6 py-32 md:py-48">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-white/35">
          {labels.before}
        </p>
        <div className="mt-6 overflow-hidden rounded-sm bg-white/[0.02]">
          <PortfolioImage
            src={item.beforeImage}
            alt={labels.before}
            variant="before"
            priority
            aspectClassName="aspect-[4/5] md:aspect-[16/9]"
          />
        </div>
      </div>

      <FlowDivider />

      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-white/35">
          {labels.premium}
        </p>
        <div className="mt-6 overflow-hidden rounded-sm bg-white/[0.02]">
          <PortfolioImage
            src={item.premiumImage}
            alt={labels.premium}
            variant="premium"
            aspectClassName="aspect-[4/5] md:aspect-[16/9]"
          />
        </div>
      </div>

      <FlowDivider />

      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-white/35">
          {labels.commercial}
        </p>
        <div className="mt-6 overflow-hidden rounded-sm bg-white/[0.02]">
          <CommercialVideo
            ref={videoRef}
            src={item.commercialVideo}
            muted
            loop
            playsInline
            preload="none"
            className="aspect-[4/5] w-full object-cover md:aspect-[16/9]"
          />
        </div>
      </div>
    </section>
  );
}
