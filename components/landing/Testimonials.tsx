"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { LandingContent } from "@/lib/i18n";
import PortfolioImage from "@/components/landing/PortfolioImage";
import CommercialVideo from "@/components/landing/CommercialVideo";
import OwnerPhotoPlaceholder from "@/components/landing/placeholders/OwnerPhotoPlaceholder";

type TestimonialsProps = {
  headline: string;
  items: LandingContent["testimonials"]["items"];
};

function TestimonialCard({
  item,
}: {
  item: LandingContent["testimonials"]["items"][number];
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ownerPhotoFailed, setOwnerPhotoFailed] = useState(false);
  const hasQuote = item.quote.trim().length > 0;
  const hasOwnerDetails =
    item.businessName.trim().length > 0 || item.city.trim().length > 0;

  useEffect(() => {
    const probe = new window.Image();
    const handleError = () => setOwnerPhotoFailed(true);

    probe.addEventListener("error", handleError);
    probe.src = item.ownerPhoto;

    return () => {
      probe.removeEventListener("error", handleError);
    };
  }, [item.ownerPhoto]);

  if (!hasQuote) return null;

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
      className="grid gap-10 border-t border-white/10 py-16 md:grid-cols-[240px_1fr] md:gap-16 md:py-24"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <div className="space-y-8">
        <div className="relative h-20 w-20 overflow-hidden rounded-full bg-white/5">
          {ownerPhotoFailed ? (
            <OwnerPhotoPlaceholder />
          ) : (
            <Image
              src={item.ownerPhoto}
              alt={item.businessName || item.id}
              fill
              loading="lazy"
              sizes="80px"
              className="object-cover"
              onError={() => setOwnerPhotoFailed(true)}
            />
          )}
        </div>

        {hasOwnerDetails && (
          <div>
            {item.businessName.trim() && (
              <p className="text-xl font-semibold text-[#F5F5F0]">
                {item.businessName}
              </p>
            )}
            {item.city.trim() && (
              <p className="mt-2 text-sm uppercase tracking-[0.2em] text-white/45">
                {item.city}
              </p>
            )}
          </div>
        )}

        <blockquote className="text-lg leading-relaxed text-white/70 md:text-xl">
          &ldquo;{item.quote}&rdquo;
        </blockquote>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="overflow-hidden rounded-sm bg-white/[0.02]">
          <PortfolioImage
            src={item.beforeImage}
            alt=""
            variant="before"
            aspectClassName="aspect-[4/5]"
          />
        </div>
        <div className="overflow-hidden rounded-sm bg-white/[0.02]">
          <PortfolioImage
            src={item.premiumImage}
            alt=""
            variant="premium"
            aspectClassName="aspect-[4/5]"
          />
        </div>
        <div className="overflow-hidden rounded-sm bg-white/[0.02]">
          <CommercialVideo
            ref={videoRef}
            src={item.commercialVideo}
            muted
            loop
            playsInline
            preload="none"
            className="aspect-[4/5] h-full w-full object-cover"
          />
        </div>
      </div>
    </article>
  );
}

export default function Testimonials({ headline, items }: TestimonialsProps) {
  const visibleItems = items.filter((item) => item.quote.trim().length > 0);

  if (visibleItems.length === 0) return null;

  return (
    <section id="testimonials" className="mx-auto max-w-7xl px-6 py-32 md:py-40">
      <h2 className="max-w-3xl text-3xl font-bold tracking-tight text-[#F5F5F0] md:text-5xl">
        {headline}
      </h2>

      <div className="mt-20">
        {visibleItems.map((item) => (
          <TestimonialCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
