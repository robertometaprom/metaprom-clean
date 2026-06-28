"use client";

import CommercialVideo from "@/components/landing/CommercialVideo";

type PhoneMockupProps = {
  videoSrc: string;
  className?: string;
  showSocialChrome?: boolean;
};

export default function PhoneMockup({
  videoSrc,
  className = "",
  showSocialChrome = true,
}: PhoneMockupProps) {
  return (
    <div
      className={`relative ${className}`}
      aria-label="Comercial de ejemplo en teléfono"
    >
      <div className="relative rounded-[2.75rem] border-[4px] border-neutral-800 bg-neutral-900 p-[7px] shadow-[0_32px_64px_rgba(0,0,0,0.45),0_0_48px_rgba(139,92,246,0.2)]">
        <div className="absolute left-1/2 top-[11px] z-20 h-5 w-[78px] -translate-x-1/2 rounded-full bg-black" />

        <div className="relative overflow-hidden rounded-[2.25rem] bg-black">
          <CommercialVideo
            src={videoSrc}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="aspect-[9/16] w-full object-cover"
          />

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
      </div>
    </div>
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
