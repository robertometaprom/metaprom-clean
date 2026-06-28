"use client";

import Image from "next/image";
import CommercialVideo from "@/components/landing/CommercialVideo";
import type { SocialPostConfig } from "@/lib/studio-atmosphere";

type SocialPostCardProps = {
  post: SocialPostConfig;
};

const PLATFORM_LABELS: Record<SocialPostConfig["platform"], string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube Shorts",
  facebook: "Facebook",
};

const PLATFORM_COLORS: Record<SocialPostConfig["platform"], string> = {
  tiktok: "text-white",
  instagram: "from-pink-500 to-orange-400",
  youtube: "text-red-500",
  facebook: "text-blue-500",
};

export default function SocialPostCard({ post }: SocialPostCardProps) {
  return (
    <div
      className={`pointer-events-none absolute hidden w-[148px] lg:block xl:w-[168px] ${post.position}`}
      style={{ transform: `rotate(${post.rotation}deg)` }}
      aria-hidden
    >
      <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
        <div className="flex items-center justify-between border-b border-neutral-100 px-2.5 py-1.5">
          <span
            className={`text-[10px] font-bold ${
              post.platform === "tiktok"
                ? PLATFORM_COLORS.tiktok
                : post.platform === "youtube"
                  ? PLATFORM_COLORS.youtube
                  : post.platform === "facebook"
                    ? PLATFORM_COLORS.facebook
                    : "bg-gradient-to-r from-pink-500 to-orange-400 bg-clip-text text-transparent"
            }`}
          >
            {PLATFORM_LABELS[post.platform]}
          </span>
          <span className="text-[9px] text-neutral-400">•••</span>
        </div>

        <div className="relative aspect-[4/5] bg-neutral-100">
          {post.videoSrc ? (
            <CommercialVideo
              src={post.videoSrc}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className="h-full w-full object-cover"
            />
          ) : post.imageSrc ? (
            <Image
              src={post.imageSrc}
              alt=""
              fill
              sizes="168px"
              className="object-cover"
            />
          ) : null}
        </div>

        <div className="space-y-0.5 px-2.5 py-2">
          <p className="truncate text-[10px] font-semibold text-neutral-800">
            {post.handle}
          </p>
          <p className="line-clamp-2 text-[9px] leading-snug text-neutral-500">
            {post.caption}
          </p>
          <p className="text-[9px] font-medium text-neutral-400">
            ♥ {post.likes}
          </p>
        </div>
      </div>
    </div>
  );
}
