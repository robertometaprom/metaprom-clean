type VideoWithWebkit = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitDisplayingFullscreen?: boolean;
};

/** Call synchronously inside a user-gesture handler before any await. */
export function primeCinematicFullscreen(): void {
  if (typeof document === "undefined" || document.fullscreenElement) return;

  const root = document.documentElement;
  if (!root.requestFullscreen) return;

  void root.requestFullscreen().catch(() => undefined);
}

export async function requestCinematicFullscreen(
  container: HTMLElement | null,
  video: HTMLVideoElement | null,
): Promise<boolean> {
  if (typeof document === "undefined") return false;
  if (document.fullscreenElement) return true;

  const webkitVideo = video as VideoWithWebkit | null;

  if (webkitVideo?.webkitDisplayingFullscreen) return true;

  const targets: (HTMLElement | null)[] = [container, video, document.documentElement];

  for (const target of targets) {
    if (!target?.requestFullscreen) continue;
    try {
      await target.requestFullscreen();
      return true;
    } catch {
      // try next target
    }
  }

  if (webkitVideo?.webkitEnterFullscreen) {
    try {
      webkitVideo.webkitEnterFullscreen();
      return true;
    } catch {
      // visual fullscreen overlay still covers the viewport
    }
  }

  return false;
}
