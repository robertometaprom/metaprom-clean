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
  poster?: string;
  fullBleed?: boolean;
  lazyLoad?: boolean;
};

const CommercialVideo = forwardRef<HTMLVideoElement, CommercialVideoProps>(
  function CommercialVideo(
    {
      src,
      poster,
      className = "",
      fullBleed = false,
      lazyLoad = false,
      preload,
      onError,
      ...videoProps
    },
    forwardedRef,
  ) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [failed, setFailed] = useState(false);

    useImperativeHandle(forwardedRef, () => videoRef.current as HTMLVideoElement);

    useEffect(() => {
      if (!lazyLoad) return;
      const video = videoRef.current;
      if (!video) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          video.preload =
            preload === "auto" || preload === "none" || preload === ""
              ? preload
              : "metadata";
          observer.disconnect();
        },
        { rootMargin: "240px", threshold: 0.01 },
      );

      observer.observe(video);
      return () => observer.disconnect();
    }, [lazyLoad, preload]);

    if (failed) {
      return (
        <CommercialVideoPlaceholder className={className} fullBleed={fullBleed} />
      );
    }

    return (
      <video
        ref={videoRef}
        poster={poster}
        preload={lazyLoad ? "none" : preload}
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
