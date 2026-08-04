"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  createRevealProbeSessionId,
  emitRevealVideoProbeEvent,
  getRevealVideoProbeFlag,
  isRevealVideoProbeEnabled,
  type RevealVideoProbeEvent,
  type RevealVideoProbeEventName,
} from "@/lib/diagnostics/reveal-video-probe";

type RevealStage = "fade" | "logo" | "playback" | "offer";

const FADE_DURATION_MS = 500;
const LOGO_DURATION_MS = 1000;
const PROBE_TIMEOUT_MS = 12000;

export default function RevealVideoProbePage() {
  const sessionIdRef = useRef(createRevealProbeSessionId());
  const [stage, setStage] = useState<RevealStage>("fade");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [events, setEvents] = useState<RevealVideoProbeEvent[]>([]);
  const [hydratedClientEnabled, setHydratedClientEnabled] = useState<
    boolean | null
  >(null);
  const [deploymentId, setDeploymentId] = useState<string>("unknown");
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const clientEnabled = isRevealVideoProbeEnabled();
  const probeFlag = getRevealVideoProbeFlag();

  const pushEvent = useCallback(
    async (
      event: RevealVideoProbeEventName,
      extra?: Partial<RevealVideoProbeEvent>,
    ) => {
      const video = videoRef.current;
      const payload: RevealVideoProbeEvent = {
        sessionId: sessionIdRef.current,
        event,
        ts: Date.now(),
        stage,
        videoReady,
        readyState: video?.readyState,
        networkState: video?.networkState,
        userAgent:
          typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        visibilityState:
          typeof document !== "undefined" ? document.visibilityState : undefined,
        srcKind: videoUrl?.startsWith("blob:") ? "blob" : "url",
        ...extra,
      };

      setEvents((current) => [...current, payload]);
      await emitRevealVideoProbeEvent(payload);
    },
    [stage, videoReady, videoUrl],
  );

  useEffect(() => {
    setHydratedClientEnabled(isRevealVideoProbeEnabled());
    setDeploymentId(
      process.env.NEXT_PUBLIC_VERCEL_DEPLOYMENT_ID ||
        process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
        "local-or-missing",
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await pushEvent("probe_mount");

      const response = await fetch("/diagnostics/sample-teaser.mp4");
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      if (cancelled) {
        URL.revokeObjectURL(blobUrl);
        return;
      }

      setVideoUrl(blobUrl);
      await pushEvent("blob_url_created", { detail: `bytes=${blob.size}` });
    })();

    return () => {
      cancelled = true;
    };
  }, [pushEvent]);

  useEffect(() => {
    if (stage !== "fade") return;
    const timer = window.setTimeout(() => {
      setStage("logo");
      void pushEvent("stage_logo");
    }, FADE_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [stage, pushEvent]);

  useEffect(() => {
    if (stage !== "logo") return;
    const timer = window.setTimeout(() => {
      setStage("playback");
      void pushEvent("stage_playback");
    }, LOGO_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [stage, pushEvent]);

  useEffect(() => {
    void pushEvent("stage_fade");
  }, [pushEvent]);

  useEffect(() => {
    if (!videoUrl) return;

    const timer = window.setTimeout(() => {
      void pushEvent("probe_timeout", {
        detail: `videoReady=${videoReady}`,
      });
    }, PROBE_TIMEOUT_MS);

    return () => window.clearTimeout(timer);
  }, [videoUrl, videoReady, pushEvent]);

  useEffect(() => {
    if (!videoReady && stage !== "offer") {
      void pushEvent("spinner_visible");
    }
  }, [videoReady, stage, pushEvent]);

  const handleVideoCanPlay = useCallback(() => {
    setVideoReady(true);
    void pushEvent("video_canplay");
    void pushEvent("video_ready_true");
  }, [pushEvent]);

  const statusLabel =
    hydratedClientEnabled === null
      ? clientEnabled
        ? "ACTIVE"
        : "INACTIVE"
      : hydratedClientEnabled
        ? "ACTIVE"
        : "INACTIVE";

  return (
    <main className="min-h-screen bg-black p-4 text-white">
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="text-lg font-semibold">Reveal video probe</h1>
        <p
          data-probe-client-status={
            statusLabel === "ACTIVE" ? "active" : "inactive"
          }
          data-probe-flag={probeFlag || "empty"}
          data-probe-hydrated={
            hydratedClientEnabled === null
              ? "pending"
              : hydratedClientEnabled
                ? "active"
                : "inactive"
          }
          data-probe-deployment={deploymentId}
          className={`rounded-lg px-3 py-2 text-sm font-semibold ${
            statusLabel === "ACTIVE"
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-red-500/15 text-red-300"
          }`}
        >
          Client probe: {statusLabel}
        </p>
        <p className="font-mono text-[11px] text-white/60">
          flag={probeFlag || "(empty)"} hydrated=
          {hydratedClientEnabled === null
            ? "pending"
            : String(hydratedClientEnabled)}{" "}
          dpl={deploymentId}
        </p>
        <p className="text-xs text-white/60">
          Session: {sessionIdRef.current}
        </p>
        <p className="text-sm">
          stage={stage} videoReady={String(videoReady)} spinner=
          {String(!videoReady && stage !== "offer")}
        </p>

        <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-black">
          {videoUrl && (
            <video
              ref={videoRef}
              src={videoUrl}
              playsInline
              preload="auto"
              muted
              className={`absolute inset-0 h-full w-full object-contain ${
                stage === "playback"
                  ? "opacity-100"
                  : "pointer-events-none invisible opacity-0"
              }`}
              onLoadStart={() => void pushEvent("video_loadstart")}
              onLoadedMetadata={() => void pushEvent("video_loadedmetadata")}
              onLoadedData={() => {
                setVideoReady(true);
                void pushEvent("video_loadeddata");
                void pushEvent("video_ready_true");
              }}
              onCanPlay={handleVideoCanPlay}
              onCanPlayThrough={() => void pushEvent("video_canplaythrough")}
              onPlaying={() => void pushEvent("video_playing")}
              onWaiting={() => void pushEvent("video_waiting")}
              onStalled={() => void pushEvent("video_stalled")}
              onSuspend={() => void pushEvent("video_suspend")}
              onError={() => {
                const mediaError = videoRef.current?.error;
                void pushEvent("video_error", {
                  errorCode: mediaError?.code ?? null,
                  errorMessage: mediaError?.message ?? null,
                });
              }}
            />
          )}

          {!videoReady && stage !== "offer" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-violet-400" />
            </div>
          )}
        </div>

        <ol className="max-h-80 space-y-1 overflow-y-auto font-mono text-[11px] text-white/80">
          {events.map((entry, index) => (
            <li key={`${entry.event}-${entry.ts}-${index}`}>
              {new Date(entry.ts).toISOString()} {entry.event} rs=
              {entry.readyState ?? "-"} ns={entry.networkState ?? "-"}
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
