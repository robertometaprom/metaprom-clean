"use client";

import CommercialVideo from "@/components/landing/CommercialVideo";
import { forwardRef, type VideoHTMLAttributes } from "react";

type ProtectedPreviewVideoProps = Omit<
  VideoHTMLAttributes<HTMLVideoElement>,
  "children" | "controlsList" | "draggable"
> & {
  src: string;
  fullBleed?: boolean;
};

/**
 * Browser-level deterrents for preview download. Not DRM — normal UX is watch + share.
 */
const ProtectedPreviewVideo = forwardRef<
  HTMLVideoElement,
  ProtectedPreviewVideoProps
>(function ProtectedPreviewVideo(
  { src, className = "", fullBleed = false, ...videoProps },
  ref,
) {
  return (
    <div
      className="select-none"
      onContextMenu={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
    >
      <CommercialVideo
        ref={ref}
        src={src}
        className={className}
        fullBleed={fullBleed}
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        draggable={false}
        playsInline
        {...videoProps}
      />
    </div>
  );
});

export default ProtectedPreviewVideo;
