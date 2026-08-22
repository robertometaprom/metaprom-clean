"use client";

import Link from "next/link";
import { useRef } from "react";
import { readShareChannelFromSearchParams } from "@/lib/analytics/channel";
import { trackGrowthEvent } from "@/lib/growth/events";

type PublicCommercialCtaProps = {
  label: string;
  href: string;
  shareSlug?: string;
};

export default function PublicCommercialCta({
  label,
  href,
  shareSlug,
}: PublicCommercialCtaProps) {
  const sentRef = useRef(false);

  const handleClick = () => {
    if (!shareSlug || sentRef.current) {
      return;
    }

    const key = `mp.share_cta.${shareSlug}`;
    try {
      if (sessionStorage.getItem(key)) {
        sentRef.current = true;
        return;
      }
      sessionStorage.setItem(key, "1");
    } catch {
      // Private mode.
    }

    sentRef.current = true;
    const channel =
      typeof window === "undefined"
        ? null
        : readShareChannelFromSearchParams(
            new URLSearchParams(window.location.search),
          );

    void trackGrowthEvent({
      shareSlug,
      eventType: "share_cta_clicked",
      metadata: {
        surface: "public_page",
        ...(channel ? { channel } : {}),
      },
    });
  };

  return (
    <section className="py-2">
      <Link
        href={href}
        onClick={handleClick}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#F5F5F0] px-6 text-sm font-semibold text-black transition hover:bg-white md:w-auto md:min-w-52"
      >
        {label}
      </Link>
    </section>
  );
}
