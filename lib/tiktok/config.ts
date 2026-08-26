import { isSafeTikTokPixelId } from "@/lib/tiktok/ids";

export function getTikTokPixelId(): string | null {
  const fromPublic = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID?.trim() ?? "";
  const fromServer = process.env.TIKTOK_PIXEL_ID?.trim() ?? "";
  const value = fromPublic || fromServer;
  return isSafeTikTokPixelId(value) ? value : null;
}

export function getPublicAppOrigin(): string | null {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  if (!configured) {
    return null;
  }
  return configured.replace(/\/$/, "");
}
