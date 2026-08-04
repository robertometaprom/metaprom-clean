export type RevealVideoProbeEventName =
  | "probe_mount"
  | "blob_url_created"
  | "video_loadstart"
  | "video_loadedmetadata"
  | "video_loadeddata"
  | "video_canplay"
  | "video_canplaythrough"
  | "video_playing"
  | "video_error"
  | "video_stalled"
  | "video_suspend"
  | "video_waiting"
  | "stage_fade"
  | "stage_logo"
  | "stage_playback"
  | "stage_offer"
  | "video_ended"
  | "handle_video_ended_entered"
  | "set_stage_offer_requested"
  | "webkit_displaying_fullscreen"
  | "document_fullscreen_element"
  | "offer_ui_mounted"
  | "offer_ui_visible_dimensions"
  | "webkit_exit_fullscreen_called"
  | "video_ready_true"
  | "start_playback_called"
  | "play_promise_rejected"
  | "play_promise_resolved"
  | "spinner_visible"
  | "probe_timeout";

export type RevealVideoProbeEvent = {
  sessionId: string;
  event: RevealVideoProbeEventName;
  ts: number;
  stage?: string;
  videoReady?: boolean;
  readyState?: number;
  networkState?: number;
  errorCode?: number | null;
  errorMessage?: string | null;
  srcKind?: "blob" | "url";
  userAgent?: string;
  visibilityState?: string;
  detail?: string;
};

// Must be a direct `process.env.NEXT_PUBLIC_*` reference so Next/Turbopack
// can replace it with a build-time string literal in the client bundle.
const PROBE_FLAG = process.env.NEXT_PUBLIC_REVEAL_VIDEO_PROBE;
const PROBE_ENABLED = PROBE_FLAG === "1" || PROBE_FLAG === "true";

export function isRevealVideoProbeEnabled(): boolean {
  return PROBE_ENABLED;
}

export function getRevealVideoProbeFlag(): string {
  return PROBE_FLAG ?? "";
}

export function createRevealProbeSessionId(): string {
  return `rvp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function emitRevealVideoProbeEvent(
  event: RevealVideoProbeEvent,
): Promise<void> {
  if (typeof window !== "undefined") {
    const w = window as Window & {
      __REVEAL_VIDEO_PROBE_EVENTS__?: RevealVideoProbeEvent[];
    };
    w.__REVEAL_VIDEO_PROBE_EVENTS__ = w.__REVEAL_VIDEO_PROBE_EVENTS__ ?? [];
    w.__REVEAL_VIDEO_PROBE_EVENTS__.push(event);
  }

  if (!PROBE_ENABLED) {
    return;
  }

  try {
    await fetch("/api/diagnostics/reveal-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
      keepalive: true,
    });
  } catch {
    // diagnostics must not affect UX
  }
}
