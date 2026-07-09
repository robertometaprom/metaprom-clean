"use client";

import { useLayoutEffect, useRef, useState } from "react";
import PhoneMockup from "@/components/studio/PhoneMockup";
import {
  COMMERCIAL_VIDEO_SRC,
  PHONE_WIDTH,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  SCREEN_X,
  SCREEN_Y,
} from "@/lib/phone-device-spec";

export type PhoneLayoutMetrics = {
  videoX: number;
  videoY: number;
  videoWidth: number;
  videoHeight: number;
  phoneWidth: number;
  phoneHeight: number;
  screenWidth: number;
  screenHeight: number;
};

export type PhoneVideoDeviceProps = {
  videoSrc?: string;
  debug?: boolean;
};

function round(value: number) {
  return Math.round(value);
}

export default function PhoneVideoDevice({
  videoSrc = COMMERCIAL_VIDEO_SRC,
  debug = false,
}: PhoneVideoDeviceProps) {
  const phoneRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState<PhoneLayoutMetrics | null>(null);

  useLayoutEffect(() => {
    const phone = phoneRef.current;
    if (!phone) {
      return;
    }

    const measure = () => {
      const phoneRect = phone.getBoundingClientRect();
      const screen = phone.querySelector<HTMLElement>("[data-phone-screen]");
      const video = phone.querySelector<HTMLVideoElement>("video");
      if (!screen || !video) {
        return;
      }

      const screenRect = screen.getBoundingClientRect();
      const videoRect = video.getBoundingClientRect();

      setMetrics({
        videoX: round(videoRect.left - phoneRect.left),
        videoY: round(videoRect.top - phoneRect.top),
        videoWidth: round(videoRect.width),
        videoHeight: round(videoRect.height),
        phoneWidth: round(phoneRect.width),
        phoneHeight: round(phoneRect.height),
        screenWidth: round(screenRect.width),
        screenHeight: round(screenRect.height),
      });
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(phone);

    const video = phone.querySelector<HTMLVideoElement>("video");
    video?.addEventListener("loadedmetadata", measure);

    return () => {
      observer.disconnect();
      video?.removeEventListener("loadedmetadata", measure);
    };
  }, []);

  return (
    <div
      className="relative"
      ref={phoneRef}
      style={{ width: PHONE_WIDTH }}
    >
      <PhoneMockup videoSrc={videoSrc} showSocialChrome={false} />

      {debug && metrics ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: metrics.phoneHeight + 24,
            width: metrics.phoneWidth,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 12,
            lineHeight: 1.6,
            color: "#a3a3a3",
            whiteSpace: "nowrap",
          }}
        >
          <div>
            Screen X: {SCREEN_X} · Screen Y: {SCREEN_Y}
          </div>
          <div>
            Screen Width: {SCREEN_WIDTH} · Screen Height: {SCREEN_HEIGHT}
          </div>
          <div>Video X: {metrics.videoX}</div>
          <div>Video Y: {metrics.videoY}</div>
          <div>Video Width: {metrics.videoWidth}</div>
          <div>Video Height: {metrics.videoHeight}</div>
          <div>Phone Width: {metrics.phoneWidth}</div>
          <div>Phone Height: {metrics.phoneHeight}</div>
          <div>Rendered Screen Width: {metrics.screenWidth}</div>
          <div>Rendered Screen Height: {metrics.screenHeight}</div>
        </div>
      ) : null}
    </div>
  );
}
