"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

const TRANSITION_MS = 500;

type LivingShowcaseProps = {
  videos: readonly string[];
  className?: string;
  /** Horizontal/vertical crop anchor for object-fit: cover. */
  objectPosition?: string;
};

export default function LivingShowcase({
  videos,
  className = "",
  objectPosition,
}: LivingShowcaseProps) {
  const [activeSlot, setActiveSlot] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const videoRefs = useRef<[HTMLVideoElement | null, HTMLVideoElement | null]>([
    null,
    null,
  ]);
  const indexRef = useRef(0);
  const activeSlotRef = useRef(0);
  const transitioningRef = useRef(false);
  const transitionTimerRef = useRef<number | null>(null);

  useEffect(() => {
    activeSlotRef.current = activeSlot;
  }, [activeSlot]);

  const nextIndex = useCallback(
    (index: number) => (index + 1) % videos.length,
    [videos.length],
  );

  const assignSource = useCallback(
    (slot: 0 | 1, index: number) => {
      const video = videoRefs.current[slot];
      if (!video) return;
      const src = videos[index];
      if (video.dataset.src !== src) {
        video.dataset.src = src;
        video.src = src;
        video.load();
      }
    },
    [videos],
  );

  const preloadAll = useCallback(() => {
    videos.forEach((src) => {
      const probe = document.createElement("video");
      probe.preload = "auto";
      probe.muted = true;
      probe.playsInline = true;
      probe.src = src;
      probe.load();
    });
  }, [videos]);

  const finishTransition = useCallback(
    (incomingSlot: 0 | 1) => {
      const outgoingSlot = (1 - incomingSlot) as 0 | 1;
      const outgoing = videoRefs.current[outgoingSlot];
      outgoing?.pause();

      indexRef.current = nextIndex(indexRef.current);
      assignSource(outgoingSlot, nextIndex(indexRef.current));

      setActiveSlot(incomingSlot);
      setTransitioning(false);
      transitioningRef.current = false;
    },
    [assignSource, nextIndex],
  );

  const beginTransition = useCallback(() => {
    if (transitioningRef.current || videos.length <= 1) return;

    const currentActive = activeSlotRef.current;
    const incomingSlot = (1 - currentActive) as 0 | 1;
    const incoming = videoRefs.current[incomingSlot];
    if (!incoming) return;

    transitioningRef.current = true;
    setTransitioning(true);

    incoming.currentTime = 0;
    void incoming.play();

    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
    }

    transitionTimerRef.current = window.setTimeout(() => {
      finishTransition(incomingSlot);
      transitionTimerRef.current = null;
    }, TRANSITION_MS);
  }, [finishTransition, videos.length]);

  const handleTimeUpdate = useCallback(
    (slot: 0 | 1) => {
      if (slot !== activeSlotRef.current || transitioningRef.current) return;

      const video = videoRefs.current[slot];
      if (!video || !Number.isFinite(video.duration) || video.duration <= 0) {
        return;
      }

      const remainingMs = (video.duration - video.currentTime) * 1000;
      if (remainingMs <= TRANSITION_MS) {
        beginTransition();
      }
    },
    [beginTransition],
  );

  const handleEnded = useCallback(
    (slot: 0 | 1) => {
      if (slot !== activeSlotRef.current || transitioningRef.current) return;
      beginTransition();
    },
    [beginTransition],
  );

  useEffect(() => {
    preloadAll();

    assignSource(0, 0);
    assignSource(1, nextIndex(0));

    const starter = videoRefs.current[0];
    if (starter) {
      void starter.play().catch(() => {});
    }
  }, [assignSource, nextIndex, preloadAll]);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  const slotStyle = (slot: 0 | 1): CSSProperties => {
    const isActive = slot === activeSlot;
    const isIncoming = transitioning && slot !== activeSlot;

    if (!transitioning) {
      return {
        opacity: isActive ? 1 : 0,
        filter: "brightness(1)",
      };
    }

    if (isActive) {
      return {
        opacity: 0,
        filter: "brightness(0.88)",
        transition: `opacity ${TRANSITION_MS}ms ease-in-out, filter ${TRANSITION_MS}ms ease-in-out`,
      };
    }

    if (isIncoming) {
      return {
        opacity: 1,
        filter: "brightness(1)",
        transition: `opacity ${TRANSITION_MS}ms ease-in-out, filter ${TRANSITION_MS}ms ease-in-out`,
      };
    }

    return { opacity: 0, filter: "brightness(1)" };
  };

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      {([0, 1] as const).map((slot) => (
        <video
          key={slot}
          ref={(node) => {
            videoRefs.current[slot] = node;
          }}
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            ...slotStyle(slot),
            ...(objectPosition ? { objectPosition } : {}),
          }}
          onTimeUpdate={() => handleTimeUpdate(slot)}
          onEnded={() => handleEnded(slot)}
        />
      ))}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          opacity: transitioning ? 1 : 0,
          background:
            "linear-gradient(105deg, transparent 38%, rgba(255,255,255,0.14) 50%, transparent 62%)",
          transform: transitioning ? "translateX(115%)" : "translateX(-115%)",
          transition: transitioning
            ? `transform ${TRANSITION_MS}ms ease-in-out, opacity 180ms ease-out`
            : "opacity 180ms ease-out",
        }}
      />
    </div>
  );
}
