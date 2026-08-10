import type { Locale } from "@/lib/i18n";
import type { PublicPreviewKind } from "@/lib/preview/types";
import { buildWhatsAppShareUrl } from "@/lib/share/whatsapp-message";

export type ShareProviderId =
  | "whatsapp"
  | "copy_link"
  | "facebook"
  | "linkedin"
  | "x"
  | "email";

export type ShareProviderContext = {
  publicPreviewUrl: string;
  locale: Locale;
  assetType?: PublicPreviewKind;
};

export type ShareProvider = {
  id: ShareProviderId;
  enabled: boolean;
  buildActionUrl?: (context: ShareProviderContext) => string;
  growthEventType?: "share_whatsapp" | "share_copy" | "share";
};

export const SHARE_PROVIDERS: ShareProvider[] = [
  {
    id: "whatsapp",
    enabled: true,
    growthEventType: "share_whatsapp",
    buildActionUrl: (context) =>
      buildWhatsAppShareUrl({
        publicPreviewUrl: context.publicPreviewUrl,
        locale: context.locale,
        assetType: context.assetType,
      }),
  },
  {
    id: "copy_link",
    enabled: true,
    growthEventType: "share_copy",
  },
  {
    id: "facebook",
    enabled: false,
    buildActionUrl: (context) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(context.publicPreviewUrl)}`,
  },
  {
    id: "linkedin",
    enabled: false,
    buildActionUrl: (context) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(context.publicPreviewUrl)}`,
  },
  {
    id: "x",
    enabled: false,
    buildActionUrl: (context) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(context.publicPreviewUrl)}`,
  },
  {
    id: "email",
    enabled: false,
    buildActionUrl: (context) => {
      const subject =
        context.locale === "es"
          ? "Mira mi comercial de Metaprom"
          : "Check out my Metaprom commercial";
      const body =
        context.locale === "es"
          ? `Mira el comercial que hice con Metaprom:\n${context.publicPreviewUrl}`
          : `Check out this commercial I made with Metaprom:\n${context.publicPreviewUrl}`;

      return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    },
  },
];

export function getEnabledShareProviders(): ShareProvider[] {
  return SHARE_PROVIDERS.filter((provider) => provider.enabled);
}

export function getShareProvider(id: ShareProviderId): ShareProvider | undefined {
  return SHARE_PROVIDERS.find((provider) => provider.id === id);
}
