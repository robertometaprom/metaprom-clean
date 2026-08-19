import type { PublicPreviewKind } from "@/lib/preview/types";

export type SmsShareMessageContext = {
  publicPreviewUrl: string;
  assetType?: PublicPreviewKind;
};

export function buildSmsShareMessage(
  context: SmsShareMessageContext,
): string {
  const url = context.publicPreviewUrl;
  if (context.assetType === "advertising_image") {
    return `Check out my Metaprom image: ${url}`;
  }

  return `Check out my Metaprom commercial: ${url}`;
}

/**
 * Standard `sms:` share link — no provider, phone capture, or infrastructure.
 * `?&body=` is the common iOS + Android form when no recipient is set.
 */
export function buildSmsShareUrl(context: SmsShareMessageContext): string {
  return `sms:?&body=${encodeURIComponent(buildSmsShareMessage(context))}`;
}
