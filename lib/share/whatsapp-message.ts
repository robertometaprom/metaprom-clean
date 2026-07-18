import type { GrowthEventMetadata } from "@/lib/growth/events";

export type WhatsAppMessageVariant = "default" | "curiosity";

export type WhatsAppShareMessageContext = {
  publicPreviewUrl: string;
  locale?: "es" | "en";
  metadata?: GrowthEventMetadata;
};

const MESSAGE_BUILDERS: Record<
  WhatsAppMessageVariant,
  (context: WhatsAppShareMessageContext) => string
> = {
  default: ({ publicPreviewUrl, locale = "es" }) =>
    locale === "es"
      ? `Mira el comercial que hice con Metaprom\n${publicPreviewUrl}`
      : `Check out this commercial I made with Metaprom\n${publicPreviewUrl}`,
  curiosity: ({ publicPreviewUrl, locale = "es" }) =>
    locale === "es"
      ? `¿Puedes creer que este comercial salió de una sola foto?\n${publicPreviewUrl}`
      : `Can you believe this commercial came from a single photo?\n${publicPreviewUrl}`,
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
