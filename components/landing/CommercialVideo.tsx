"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type VideoHTMLAttributes,
} from "react";
import CommercialVideoPlaceholder from "@/components/landing/placeholders/CommercialVideoPlaceholder";

type CommercialVideoProps = Omit<
  VideoHTMLAttributes<HTMLVideoElement>,
  "children"
> & {
  src: string;
  fullBleed?: boolean;
};

const CommercialVideo = forwardRef<HTMLVideoElement, CommercialVideoProps>(
  function CommercialVideo(
    { src, className = "", fullBleed = false, onError, ...videoProps },
    forwardedRef,
  ) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [failed, setFailed] = useState(false);

    useImperativeHandle(forwardedRef, () => videoRef.current as HTMLVideoElement);

    useEffect(() => {
      const probe = document.createElement("video");
      const handleError = () => setFailed(true);

      probe.addEventListener("error", handleError);
      probe.src = src;
      probe.load();

      return () => {
        probe.removeEventListener("error", handleError);
        probe.removeAttribute("src");
        probe.load();
      };
    }, [src]);

    if (failed) {
      return (
        <CommercialVideoPlaceholder className={className} fullBleed={fullBleed} />
      );
    }

    return (
      <video
        ref={videoRef}
        className={className}
        onError={(event) => {
          setFailed(true);
          onError?.(event);
        }}
        {...videoProps}
      >
        <source src={src} type="video/mp4" />
      </video>
    );
  },
);

export default CommercialVideo;
