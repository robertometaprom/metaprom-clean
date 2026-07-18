const SLUG_PATTERN = "[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{11}";

export function buildPublicPreviewPath(shareSlug: string): string {
  return `/p/${shareSlug}`;
}

export function buildPublicPreviewStreamPath(shareSlug: string): string {
  return `/api/public/${shareSlug}/stream`;
}

export function buildPublicPreviewUrl(shareSlug: string): string {
  const base = (
    process.env.NEXT_PUBLIC_APP_URL ?? "https://metaprom.com"
  ).replace(/\/$/, "");

  return `${base}${buildPublicPreviewPath(shareSlug)}`;
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
