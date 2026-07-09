"use client";

import CommercialVideo from "@/components/landing/CommercialVideo";
import LivingShowcase from "@/components/studio/LivingShowcase";
import {
  BEZEL_TOP,
  DYNAMIC_ISLAND_HEIGHT,
  DYNAMIC_ISLAND_TOP,
  DYNAMIC_ISLAND_WIDTH,
  PHONE_FRAME_BORDER,
  PHONE_HEIGHT,
  PHONE_OUTER_RADIUS,
  PHONE_WIDTH,
  SCREEN_HEIGHT,
  SCREEN_RADIUS,
  SCREEN_WIDTH,
  SCREEN_X,
  SCREEN_Y,
  phonePct,
} from "@/lib/phone-device-spec";

type PhoneMockupProps = {
  videoSrc?: string;
  videoSources?: readonly string[];
  className?: string;
  showSocialChrome?: boolean;
  screenOnly?: boolean;
};

export default function PhoneMockup({
  videoSrc,
  videoSources,
  className = "",
  showSocialChrome = true,
  screenOnly = false,
}: PhoneMockupProps) {
  const resolvedSrc = videoSrc ?? videoSources?.[0] ?? "";
  const useLivingShowcase = (videoSources?.length ?? 0) > 1;
  if (screenOnly) {
    return (
      <div
        data-phone-screen
        className={className}
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: `${SCREEN_WIDTH} / ${SCREEN_HEIGHT}`,
          overflow: "hidden",
          borderRadius: phonePct(SCREEN_RADIUS, SCREEN_WIDTH),
          background: "#000",
        }}
        aria-label="Comercial de ejemplo en teléfono"
      >
        {useLivingShowcase && videoSources ? (
          <LivingShowcase videos={videoSources} />
        ) : (
          <PhoneScreenVideo videoSrc={resolvedSrc} />
        )}
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: `${PHONE_WIDTH} / ${PHONE_HEIGHT}`,
      }}
      aria-label="Comercial de ejemplo en teléfono"
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: phonePct(PHONE_OUTER_RADIUS, PHONE_WIDTH),
          border: `${PHONE_FRAME_BORDER}px solid #48484a`,
          background:
            "linear-gradient(145deg, #3a3a3c 0%, #1c1c1e 55%, #2c2c2e 100%)",
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.06) inset, 0 24px 48px rgba(0,0,0,0.55)",
        }}
      >
        <div
          data-phone-screen
          style={{
            position: "absolute",
            left: phonePct(SCREEN_X, PHONE_WIDTH),
            top: phonePct(SCREEN_Y, PHONE_HEIGHT),
            width: phonePct(SCREEN_WIDTH, PHONE_WIDTH),
            height: phonePct(SCREEN_HEIGHT, PHONE_HEIGHT),
            borderRadius: phonePct(SCREEN_RADIUS, SCREEN_WIDTH),
            overflow: "hidden",
            background: "#000",
          }}
        >
          {useLivingShowcase && videoSources ? (
            <LivingShowcase videos={videoSources} />
          ) : (
            <PhoneScreenVideo videoSrc={resolvedSrc} />
          )}

          {showSocialChrome && (
            <>
              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/50 to-transparent px-3 pb-8 pt-10">
                <p className="text-center text-[10px] font-semibold text-white/90">
                  TikTok
                </p>
              </div>

              <div className="pointer-events-none absolute bottom-16 right-2 z-10 flex flex-col items-center gap-3">
                <SocialAction icon="heart" label="24.5K" />
                <SocialAction icon="comment" label="892" />
                <SocialAction icon="share" label="Share" />
              </div>

              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-3 pt-12">
                <p className="text-[11px] font-semibold text-white">@style.sneakers</p>
                <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-white/85">
                  Nuevo drop disponible 🔥 Link en bio
                </p>
              </div>

              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-around border-t border-white/10 bg-black/60 py-1.5">
                <NavDot active />
                <NavDot />
                <NavDot />
                <NavDot />
                <NavDot />
              </div>
            </>
          )}
        </div>

        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "50%",
            top: phonePct(DYNAMIC_ISLAND_TOP, PHONE_HEIGHT),
            width: phonePct(DYNAMIC_ISLAND_WIDTH, PHONE_WIDTH),
            height: phonePct(DYNAMIC_ISLAND_HEIGHT, PHONE_HEIGHT),
            transform: "translateX(-50%)",
            borderRadius: 9999,
            background: "#000",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.04)",
            zIndex: 2,
          }}
        />

        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            right: phonePct(-2, PHONE_WIDTH),
            top: phonePct(BEZEL_TOP + SCREEN_HEIGHT * 0.34, PHONE_HEIGHT),
            width: phonePct(3, PHONE_WIDTH),
            height: phonePct(52, PHONE_HEIGHT),
            borderRadius: 2,
            background: "#525255",
          }}
        />
      </div>
    </div>
  );
}

function PhoneScreenVideo({ videoSrc }: { videoSrc: string }) {
  return (
    <CommercialVideo
      src={videoSrc}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}

function SocialAction({
  icon,
  label,
}: {
  icon: "heart" | "comment" | "share";
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm">
        {icon === "heart" && (
          <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        )}
        {icon === "comment" && (
          <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
          </svg>
        )}
        {icon === "share" && (
          <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" />
          </svg>
        )}
      </div>
      <span className="text-[9px] font-medium text-white">{label}</span>
    </div>
  );
}

function NavDot({ active = false }: { active?: boolean }) {
  return (
    <div
      className={`h-1 w-1 rounded-full ${active ? "bg-white" : "bg-white/35"}`}
    />
  );
}
