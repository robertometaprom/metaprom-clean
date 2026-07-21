"use client";

import Image from "next/image";
import HeroBrandLogo from "@/components/studio/HeroBrandLogo";
import HeroPhoneScreen from "@/components/studio/HeroPhoneScreen";
import { HERO_PRESENTER_BASE_SCALE_X } from "@/lib/hero-layout-spec";
import {
  HERO_FEATURES,
  HERO_PRESENTER_SRC,
  HERO_VIDEOS,
} from "@/lib/studio-atmosphere";

function FeatureIcon({ type }: { type: (typeof HERO_FEATURES)[number]["icon"] }) {
  const className = "mx-auto h-6 w-6 text-violet-400";

  if (type === "sparkles") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3l1.5 4.5L19 9l-4.5 1.5L13 15l-1.5-4.5L7 9l4.5-1.5L13 3zM18 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z"
        />
      </svg>
    );
  }
  if (type === "film") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7 4v16M17 4v16M3 8h4M3 12h4M3 16h4M17 8h4M17 12h4M17 16h4M3 20h18a1 1 0 001-1V5a1 1 0 00-1-1H3a1 1 0 00-1 1v14a1 1 0 001 1z"
        />
      </svg>
    );
  }
  if (type === "bolt") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    );
  }
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l4-4 4 4 6-8 4 4" />
    </svg>
  );
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function StudioHero() {
  return (
    <section className="relative bg-black">
      <div className="relative mx-auto max-w-[1400px] overflow-visible px-6 pb-10 pt-6 lg:px-10 lg:pb-14 lg:pt-8">
        <div className="grid items-center gap-10 overflow-visible lg:grid-cols-[5fr_3fr] lg:gap-12">
          {/* LEFT — presenter artwork + live phone screen */}
          <div className="relative mx-auto w-full max-w-[512px] overflow-visible lg:mx-0 lg:max-w-none">
            <div
              className="relative w-full overflow-visible"
              style={{ transform: `scaleX(${HERO_PRESENTER_BASE_SCALE_X})` }}
            >
              <Image
                src={HERO_PRESENTER_SRC}
                alt="Clienta mostrando su comercial creado con Metaprom"
                width={512}
                height={576}
                priority
                className="relative z-[1] h-auto w-full"
              />
              <HeroPhoneScreen videoSources={HERO_VIDEOS} className="z-[2]" />
            </div>

            <div
              className="pointer-events-none absolute bottom-[6%] left-[58%] z-[4] flex items-center gap-1.5 text-[11px] text-white/80"
              aria-hidden
            >
              <span className="text-sm leading-none text-violet-300">∞</span>
              <span>Loop continuo</span>
            </div>
          </div>

          {/* RIGHT — supporting marketing content (~35–40%) */}
          <div className="relative z-10 flex min-w-0 flex-col justify-center lg:py-4 lg:pl-10 xl:pl-14">
            <HeroBrandLogo className="mb-8" />

            <h1 className="text-[2.5rem] font-bold leading-[1.05] tracking-tight text-white sm:text-[2.85rem] lg:text-[3.35rem]">
              Videos que{" "}
              <span className="bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                venden.
              </span>
            </h1>

            <p className="mt-5 max-w-md text-base leading-relaxed text-white/75 lg:text-[17px] lg:leading-7">
              Convierte tus fotos y videos imperfectos en contenido comercial premium que
              impulsa tus ventas.
            </p>

            <div className="mt-9 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
              {HERO_FEATURES.map((feature) => (
                <div key={feature.title} className="text-center">
                  <FeatureIcon type={feature.icon} />
                  <p className="mt-2 text-xs font-medium leading-snug text-white/90 sm:text-[13px]">
                    {feature.title}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-10">
              <button
                type="button"
                onClick={() => scrollToId("studio-prompt")}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 via-purple-600 to-pink-500 px-9 py-3.5 text-base font-semibold text-white shadow-[0_10px_36px_rgba(147,51,234,0.35)] transition hover:brightness-110"
              >
                Comienza gratis
                <span aria-hidden="true">→</span>
              </button>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/55">
              <span className="inline-flex items-center gap-1.5">
                <span className="text-violet-400" aria-hidden="true">
                  ✓
                </span>
                Sin tarjeta de crédito
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="text-violet-400" aria-hidden="true">
                  ✓
                </span>
                Resultados en minutos
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
