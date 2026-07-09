"use client";

import { useLayoutEffect, useRef } from "react";
import LivingShowcase from "@/components/studio/LivingShowcase";
import { HERO_SCREEN } from "@/lib/hero-layout-spec";

/** Vertical-only stretch for hero commercial fill inside the fixed LCD opening. */
const HERO_COMMERCIAL_SCALE_Y = 1.12;

type HeroPhoneScreenProps = {
  videoSources: readonly string[];
  className?: string;
};

/**
 * Live commercial screen for the Hero presenter artwork.
 * Fixed opening — video never defines size; the measured rectangle does.
 */
export default function HeroPhoneScreen({
  videoSources,
  className = "",
}: HeroPhoneScreenProps) {
  const screenRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const screen = screenRef.current;
    if (!screen) return;

    const syncVideoSize = () => {
      const width = screen.clientWidth;
      const height = screen.clientHeight;
      if (width <= 0 || height <= 0) return;

      for (const video of screen.querySelectorAll("video")) {
        video.setAttribute("width", String(width));
        video.setAttribute("height", String(height));
        video.style.transformOrigin = "50% 50%";
        video.style.transform = `scaleY(${HERO_COMMERCIAL_SCALE_Y})`;
      }
    };

    syncVideoSize();

    const observer = new ResizeObserver(syncVideoSize);
    observer.observe(screen);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={screenRef}
      data-phone-screen
      className={className}
      style={{
        position: "absolute",
        left: HERO_SCREEN.leftPct,
        top: HERO_SCREEN.topPct,
        width: HERO_SCREEN.widthPct,
        height: HERO_SCREEN.heightPct,
        borderRadius: HERO_SCREEN.radiusPct,
        overflow: "hidden",
        background: "#000",
      }}
      aria-label="Comercial en reproducción"
    >
      <LivingShowcase
        videos={videoSources}
        objectPosition="50% calc(50% + 15px)"
      />
    </div>
  );
}
