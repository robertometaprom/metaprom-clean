"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import BeforePhotoPlaceholder from "@/components/landing/placeholders/BeforePhotoPlaceholder";
import PremiumResultPlaceholder from "@/components/landing/placeholders/PremiumResultPlaceholder";

type PortfolioImageProps = {
  src: string;
  alt: string;
  variant: "before" | "premium";
  priority?: boolean;
  className?: string;
  aspectClassName?: string;
};

export default function PortfolioImage({
  src,
  alt,
  variant,
  priority = false,
  className = "object-cover",
  aspectClassName = "aspect-[4/3] md:aspect-[16/10]",
}: PortfolioImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const probe = new window.Image();
    const handleError = () => setFailed(true);

    probe.addEventListener("error", handleError);
    probe.src = src;

    return () => {
      probe.removeEventListener("error", handleError);
    };
  }, [src]);

  return (
    <div className={`relative overflow-hidden ${aspectClassName}`}>
      {failed ? (
        variant === "before" ? (
          <BeforePhotoPlaceholder />
        ) : (
          <PremiumResultPlaceholder />
        )
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          loading={priority ? undefined : "lazy"}
          sizes="(max-width: 768px) 100vw, 1200px"
          className={className}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
