const SLUG_PATTERN = "[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{11}";
const DEFAULT_APP_URL = "http://localhost:3000";
const PRODUCTION_APP_URL = "https://metaprom.com";

export function buildPublicPreviewPath(shareSlug: string): string {
  return `/p/${shareSlug}`;
}

export function buildPublicPreviewStreamPath(shareSlug: string): string {
  return `/api/public/${shareSlug}/stream`;
}

function getAppBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  const configured =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  return process.env.NODE_ENV === "production"
    ? PRODUCTION_APP_URL
    : DEFAULT_APP_URL;
}

export function buildPublicPreviewUrl(shareSlug: string): string {
  return `${getAppBaseUrl()}${buildPublicPreviewPath(shareSlug)}`;
}

/** Metaprom-owned WhatsApp QR handoff path (public preview only — no premium media). */
export function buildWhatsAppHandoffPath(shareSlug: string): string {
  return `/share/wa/${encodeURIComponent(shareSlug)}`;
}

/** Desktop QR destination → mobile opens WhatsApp with public preview message. */
export function buildWhatsAppHandoffUrl(shareSlug: string): string {
  return `${getAppBaseUrl()}${buildWhatsAppHandoffPath(shareSlug)}`;
}

export function extractShareSlugFromPublicUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(
      new RegExp(`^/p/(${SLUG_PATTERN})$`),
    );
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}
