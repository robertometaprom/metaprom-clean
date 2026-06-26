"use client";

import { useRef } from "react";
import type { PortfolioItem } from "@/lib/portfolio";

type CommercialGalleryProps = {
  items: PortfolioItem[];
};

function GalleryCard({ item }: { item: PortfolioItem }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleEnter = () => {
    const video = videoRef.current;
    if (!video) return;
    void video.play();
  };

  const handleLeave = () => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
  };

  return (
    <article
      className="group relative overflow-hidden rounded-sm bg-white/[0.02]"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <div className="relative aspect-[4/5] overflow-hidden md:aspect-[3/4]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.premiumImage}
          alt={item.category}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.02]"
        />
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-700 group-hover:opacity-100"
        >
          <source src={item.commercialVideo} type="video/mp4" />
        </video>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80 transition group-hover:opacity-100" />
        <div className="absolute bottom-0 left-0 p-8 md:p-10">
          <p className="text-xs uppercase tracking-[0.25em] text-white/50">
            {item.emotion}
          </p>
          <h3 className="mt-3 text-2xl font-semibold text-[#F5F5F0] md:text-3xl">
            {item.category}
          </h3>
        </div>
      </div>
    </article>
  );
}

export default function CommercialGallery({ items }: CommercialGalleryProps) {
  return (
    <section id="gallery" className="mx-auto max-w-7xl px-6 py-32 md:py-40">
      <div className="grid gap-8 md:grid-cols-2 md:gap-10">
        {items.map((item) => (
          <GalleryCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
