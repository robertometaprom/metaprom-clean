import { dataUrlToFile } from "@/lib/studio-creation";
import {
  buildStudioResumeUrl,
  STUDIO_RESUME_TOKEN_KEY,
  type StudioDraftPayload,
  type StudioDraftResponse,
} from "@/lib/studio-draft/types";
import { isValidResumeToken } from "@/lib/security/validation";

export function readStoredResumeToken(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const token = sessionStorage.getItem(STUDIO_RESUME_TOKEN_KEY);
    if (!token || !isValidResumeToken(token)) {
      return null;
    }

    return token;
  } catch {
    return null;
  }
}

export function storeResumeToken(token: string) {
  try {
    sessionStorage.setItem(STUDIO_RESUME_TOKEN_KEY, token);
  } catch {
    // ignore storage errors
  }
}

export function clearStoredResumeToken() {
  try {
    sessionStorage.removeItem(STUDIO_RESUME_TOKEN_KEY);
  } catch {
    // ignore storage errors
  }
}

export function readResumeTokenFromLocation(): string | null {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const token = params.get("resume")?.trim() || null;

  if (!token || !isValidResumeToken(token)) {
    return null;
  }

  return token;
}

export function stripResumeTokenFromUrl() {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  if (!url.searchParams.has("resume")) return;

  url.searchParams.delete("resume");
  const nextPath = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, "", nextPath);
}

export async function saveStudioDraft(input: {
  payload: StudioDraftPayload;
  originalFile?: File | null;
  enhancedDataUrl?: string | null;
  teaserVideoBlob?: Blob | null;
}): Promise<{ resumeToken: string }> {
  const formData = new FormData();
  formData.append("payload", JSON.stringify(input.payload));

  if (input.originalFile) {
    formData.append("original", input.originalFile);
  }

  if (input.enhancedDataUrl) {
    formData.append(
      "enhanced",
      dataUrlToFile(input.enhancedDataUrl, "enhanced.png"),
    );
  }

  if (input.teaserVideoBlob) {
    formData.append(
      "teaser",
      new File([input.teaserVideoBlob], "teaser.mp4", { type: "video/mp4" }),
    );
  }

  const response = await fetch("/api/studio/draft", {
    method: "POST",
    body: formData,
  });

  const body = (await response.json()) as
    | { resumeToken?: string; error?: string };

  if (!response.ok || !body.resumeToken) {
    throw new Error(body.error || "No pudimos guardar tu borrador.");
  }

  storeResumeToken(body.resumeToken);
  return { resumeToken: body.resumeToken };
}

export async function fetchStudioDraft(
  token: string,
): Promise<StudioDraftResponse> {
  const response = await fetch(
    `/api/studio/draft?token=${encodeURIComponent(token)}`,
  );

  const body = (await response.json()) as StudioDraftResponse & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(body.error || "No pudimos recuperar tu borrador.");
  }

  return body;
}

export async function claimStudioDraft(token: string): Promise<{
  projectId: string;
  assetId: string;
  shareSlug: string | null;
  pendingAction: StudioDraftPayload["pendingAction"];
  phase: StudioDraftPayload["phase"];
  hadTeaser: boolean;
}> {
  const response = await fetch("/api/studio/draft/claim", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
  });

  const body = (await response.json()) as {
    projectId?: string;
    assetId?: string;
    shareSlug?: string | null;
    pendingAction?: StudioDraftPayload["pendingAction"];
    phase?: StudioDraftPayload["phase"];
    hadTeaser?: boolean;
    error?: string;
  };

  if (!response.ok || !body.projectId || !body.assetId) {
    throw new Error(body.error || "No pudimos vincular tu borrador.");
  }

  clearStoredResumeToken();
  stripResumeTokenFromUrl();

  return {
    projectId: body.projectId,
    assetId: body.assetId,
    shareSlug: body.shareSlug ?? null,
    pendingAction: body.pendingAction ?? null,
    phase: body.phase ?? "preview",
    hadTeaser: Boolean(body.hadTeaser),
  };
}

export function buildAuthRedirectUrl(resumeToken: string): string {
  return buildStudioResumeUrl(resumeToken);
}

/** Post-auth destination for Studio login/OAuth when a resume token is active. */
export function resolveStudioAuthRedirect(
  resumeTokenOverride?: string | null,
): string {
  const token =
    resumeTokenOverride?.trim() ||
    readResumeTokenFromLocation() ||
    readStoredResumeToken();

  return token ? buildAuthRedirectUrl(token) : "/studio";
}

export function buildStudioLoginUrl(resumeTokenOverride?: string | null): string {
  return `/login?redirect=${encodeURIComponent(resolveStudioAuthRedirect(resumeTokenOverride))}`;
}
