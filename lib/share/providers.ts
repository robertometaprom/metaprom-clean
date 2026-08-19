import type { Locale } from "@/lib/i18n";
import type { PublicPreviewKind } from "@/lib/preview/types";
import { buildSmsShareUrl } from "@/lib/share/sms-message";
import { buildWhatsAppShareUrl } from "@/lib/share/whatsapp-message";

export type ShareProviderId =
  | "whatsapp"
  | "copy_link"
  | "sms"
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
};

export const SHARE_PROVIDERS: ShareProvider[] = [
  {
    id: "whatsapp",
    enabled: true,
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
  },
  {
    id: "sms",
    enabled: true,
    buildActionUrl: (context) =>
      buildSmsShareUrl({
        publicPreviewUrl: context.publicPreviewUrl,
        assetType: context.assetType,
      }),
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

export function getEnabledShareProviders(locale: Locale = "es"): ShareProvider[] {
  return SHARE_PROVIDERS.filter((provider) => {
    if (!provider.enabled) {
      return false;
    }

    if (provider.id === "sms") {
      return locale === "en";
    }

    return true;
  });
}

export function getShareProvider(id: ShareProviderId): ShareProvider | undefined {
  return SHARE_PROVIDERS.find((provider) => provider.id === id);
}
