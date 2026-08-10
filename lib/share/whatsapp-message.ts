import type { GrowthEventMetadata } from "@/lib/growth/events";
import type { PublicPreviewKind } from "@/lib/preview/types";

export type WhatsAppMessageVariant = "default" | "curiosity";

export type WhatsAppShareMessageContext = {
  publicPreviewUrl: string;
  locale?: "es" | "en";
  metadata?: GrowthEventMetadata;
  /** Defaults to commercial so existing callers stay unchanged. */
  assetType?: PublicPreviewKind;
};

const MESSAGE_BUILDERS: Record<
  WhatsAppMessageVariant,
  (context: WhatsAppShareMessageContext) => string
> = {
  default: ({ publicPreviewUrl, locale = "es", assetType = "commercial" }) => {
    if (assetType === "advertising_image") {
      return locale === "es"
        ? `Mira la imagen que hice con Metaprom\n${publicPreviewUrl}`
        : `Check out this image I made with Metaprom\n${publicPreviewUrl}`;
    }

    return locale === "es"
      ? `Mira el comercial que hice con Metaprom\n${publicPreviewUrl}`
      : `Check out this commercial I made with Metaprom\n${publicPreviewUrl}`;
  },
  curiosity: ({ publicPreviewUrl, locale = "es", assetType = "commercial" }) => {
    if (assetType === "advertising_image") {
      return locale === "es"
        ? `¿Puedes creer que esta imagen salió de una sola foto?\n${publicPreviewUrl}`
        : `Can you believe this image came from a single photo?\n${publicPreviewUrl}`;
    }

    return locale === "es"
      ? `¿Puedes creer que este comercial salió de una sola foto?\n${publicPreviewUrl}`
      : `Can you believe this commercial came from a single photo?\n${publicPreviewUrl}`;
  },
};

export function buildWhatsAppShareMessage(
  context: WhatsAppShareMessageContext,
  variant: WhatsAppMessageVariant = "default",
): string {
  const builder = MESSAGE_BUILDERS[variant] ?? MESSAGE_BUILDERS.default;
  return builder(context);
}

export function buildWhatsAppShareUrl(
  context: WhatsAppShareMessageContext,
  variant: WhatsAppMessageVariant = "default",
): string {
  const message = buildWhatsAppShareMessage(context, variant);
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function listWhatsAppMessageVariants(): WhatsAppMessageVariant[] {
  return Object.keys(MESSAGE_BUILDERS) as WhatsAppMessageVariant[];
}
