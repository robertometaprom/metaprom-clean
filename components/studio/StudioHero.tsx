"use client";

import Image from "next/image";
import PhoneMockup from "@/components/studio/PhoneMockup";
import {
  HERO_FEATURES,
  HERO_PRESENTER_SRC,
  HERO_VIDEO_SRC,
} from "@/lib/studio-atmosphere";

function FeatureIcon({ type }: { type: (typeof HERO_FEATURES)[number]["icon"] }) {
  const className = "h-5 w-5 text-violet-400";

  if (type === "bolt") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    );
  }
  if (type === "target") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l4-4 4 4 6-8 4 4" />
    </svg>
  );
}

export default function StudioHero() {
  return (
    <section className="relative overflow-hidden bg-[#0f0a14]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-violet-600/30 blur-[100px]" />
        <div className="absolute right-0 top-1/4 h-[360px] w-[360px] rounded-full bg-fuchsia-600/20 blur-[90px]" />
        <div className="absolute bottom-0 left-1/2 h-[200px] w-full -translate-x-1/2 bg-gradient-to-t from-[#ececec] to-transparent" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 pb-10 pt-6 lg:px-10 lg:pb-14 lg:pt-8">
        <div className="grid items-end gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-4">
          <div className="relative mx-auto w-full max-w-[420px] lg:mx-0 lg:max-w-none">
            <div className="relative flex justify-center lg:justify-start">
              <div className="relative w-[min(100%,380px)]">
                <Image
                  src={HERO_PRESENTER_SRC}
                  alt="Clienta mostrando su comercial creado con Metaprom"
                  width={480}
                  height={560}
                  priority
                  className="relative z-[1] h-auto w-full object-contain object-bottom drop-shadow-[0_24px_48px_rgba(0,0,0,0.35)]"
                />

                <div className="absolute bottom-[8%] left-[52%] z-[2] -translate-x-1/2 lg:bottom-[10%] lg:left-[58%]">
                  <PhoneMockup
                    videoSrc={HERO_VIDEO_SRC}
                    className="w-[min(165px,36vw)] lg:w-[185px]"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center pb-2 lg:pb-10 lg:pl-4">
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm text-white/80 backdrop-blur-sm">
              <svg className="h-4 w-4 text-violet-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              De una foto, creamos
            </div>

            <h1 className="text-[2rem] font-bold leading-[1.1] tracking-tight text-white sm:text-[2.75rem] lg:text-5xl">
              Videos que{" "}
              <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                venden.
              </span>
            </h1>

            <p className="mt-4 max-w-md text-base leading-relaxed text-white/70 lg:text-lg">
              Listos para publicar en cualquier plataforma en minutos.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {HERO_FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3.5 backdrop-blur-sm"
                >
                  <FeatureIcon type={feature.icon} />
                  <p className="mt-2 text-sm font-semibold text-white">{feature.title}</p>
                  <p className="mt-0.5 text-xs leading-snug text-white/55">
                    {feature.subtitle}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
