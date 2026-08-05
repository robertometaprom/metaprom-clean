"use client";

import { useEffect, useState } from "react";
import BeforePhotoPlaceholder from "@/components/landing/placeholders/BeforePhotoPlaceholder";

type PublicOriginalPhotoProps = {
  src: string | null;
  alt: string;
  label: string;
};

export default function PublicOriginalPhoto({
  src,
  alt,
  label,
}: PublicOriginalPhotoProps) {
  const [failed, setFailed] = useState(!src);

  useEffect(() => {
    if (!src) {
      setFailed(true);
      return;
    }

    setFailed(false);
    const probe = new window.Image();
    const handleError = () => setFailed(true);

    probe.addEventListener("error", handleError);
    probe.src = src;

    return () => {
      probe.removeEventListener("error", handleError);
    };
  }, [src]);

  return (
    <section aria-labelledby="public-original-photo-label">
      <h2
        id="public-original-photo-label"
        className="mb-3 text-xs uppercase tracking-[0.2em] text-white/40"
      >
        {label}
      </h2>
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-white/5">
        {failed || !src ? (
          <BeforePhotoPlaceholder />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            className="h-full w-full object-cover"
            loading="eager"
            decoding="async"
            onError={() => setFailed(true)}
          />
        )}
      </div>
    </section>
  );
}
