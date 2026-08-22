"use client";

import { useCallback, useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n";
import {
  analyticsChannelFromShareAction,
  appendShareChannelParam,
  type ShareChannel,
} from "@/lib/analytics/channel";
import { trackGrowthEvent } from "@/lib/growth/events";
import type { PublicPreviewKind } from "@/lib/preview/types";
import { getClientLocale, getShareCommercialContent } from "@/lib/share/content";
import {
  getShareProvider,
  type ShareProviderId,
} from "@/lib/share/providers";
import { buildSmsShareUrl } from "@/lib/share/sms-message";
import {
  buildWhatsAppShareMessage,
  buildWhatsAppShareUrl,
} from "@/lib/share/whatsapp-message";

export type UseShareCommercialOptions = {
  publicPreviewUrl: string;
  shareSlug: string;
  locale?: Locale;
  /** Defaults to commercial — Advertising Image REVIEW passes advertising_image. */
  assetType?: PublicPreviewKind;
};

export type ShareCommercialAction = "native" | ShareProviderId;

export type ShareGrowthSurface =
  | "menu"
  | "review_cta"
  | "desktop_qr"
  | "handoff";

function canUseNativeShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

function isMobileShareContext(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(max-width: 768px)").matches;
}

function openShareDestination(url: string) {
  if (url.startsWith("sms:")) {
    window.location.href = url;
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy copy
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
}

export function useShareCommercial({
  publicPreviewUrl,
  shareSlug,
  locale: localeProp,
  assetType = "commercial",
}: UseShareCommercialOptions) {
  const locale = localeProp ?? getClientLocale();
  const content = useMemo(
    () => getShareCommercialContent(locale),
    [locale],
  );
  const [copyState, setCopyState] = useState<"idle" | "success" | "error">(
    "idle",
  );

  const assetTypeMetadata = useMemo(
    () => ({ asset_type: assetType }),
    [assetType],
  );

  const urlForChannel = useCallback(
    (channel: ShareChannel) => appendShareChannelParam(publicPreviewUrl, channel),
    [publicPreviewUrl],
  );

  const trackShareCreated = useCallback(
    async (
      action: ShareCommercialAction | "desktop_qr_handoff",
      surface?: ShareGrowthSurface,
    ) => {
      const channel = analyticsChannelFromShareAction(action);
      await trackGrowthEvent({
        shareSlug,
        eventType: "share_created",
        metadata: {
          channel,
          ...assetTypeMetadata,
          ...(surface ? { surface } : {}),
        },
      });
    },
    [assetTypeMetadata, shareSlug],
  );

  const trackWhatsAppCta = useCallback(
    async (_device: "mobile" | "desktop") => {
      // Desktop QR open is not a completed share.
    },
    [],
  );

  const trackDesktopQrShown = useCallback(async () => {
    // Opening the QR panel is not a completed share.
  }, []);

  const shareWhatsApp = useCallback(
    async (surface: ShareGrowthSurface = "menu") => {
      await trackShareCreated("whatsapp", surface);
      const url = buildWhatsAppShareUrl({
        publicPreviewUrl: urlForChannel("whatsapp"),
        locale,
        assetType,
      });
      openShareDestination(url);
    },
    [assetType, locale, trackShareCreated, urlForChannel],
  );

  const shareSms = useCallback(
    async (surface: ShareGrowthSurface = "menu") => {
      await trackShareCreated("sms", surface);
      openShareDestination(
        buildSmsShareUrl({
          publicPreviewUrl: urlForChannel("sms"),
          assetType,
        }),
      );
    },
    [assetType, trackShareCreated, urlForChannel],
  );

  const copyLink = useCallback(
    async (surface: ShareGrowthSurface = "menu") => {
      const copied = await copyTextToClipboard(urlForChannel("copy_link"));
      setCopyState(copied ? "success" : "error");

      if (copied) {
        await trackShareCreated("copy_link", surface);
      }

      window.setTimeout(() => setCopyState("idle"), 2000);
      return copied;
    },
    [trackShareCreated, urlForChannel],
  );

  const shareNative = useCallback(async () => {
    if (!canUseNativeShare()) {
      if (locale === "en") {
        await shareSms("review_cta");
        return "sms" as const;
      }
      await shareWhatsApp("review_cta");
      return "whatsapp" as const;
    }

    const channeledUrl = urlForChannel("native_share");
    const message = buildWhatsAppShareMessage({
      publicPreviewUrl: channeledUrl,
      locale,
      assetType,
    });

    try {
      await navigator.share({
        title: "Metaprom",
        text: message.split("\n")[0],
        url: channeledUrl,
      });
      await trackShareCreated("native", "review_cta");
      return "native" as const;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return null;
      }

      if (locale === "en") {
        await shareSms("review_cta");
        return "sms" as const;
      }

      await shareWhatsApp("review_cta");
      return "whatsapp" as const;
    }
  }, [
    assetType,
    locale,
    shareSms,
    shareWhatsApp,
    trackShareCreated,
    urlForChannel,
  ]);

  const sharePrimary = useCallback(async () => {
    if (isMobileShareContext() && canUseNativeShare()) {
      return shareNative();
    }

    if (isMobileShareContext()) {
      if (locale === "en") {
        await shareSms("review_cta");
        return "sms" as const;
      }
      await shareWhatsApp("review_cta");
      return "whatsapp" as const;
    }

    return null;
  }, [locale, shareNative, shareSms, shareWhatsApp]);

  const openProvider = useCallback(
    async (providerId: ShareProviderId) => {
      if (providerId === "copy_link") {
        await copyLink();
        return;
      }

      const provider = getShareProvider(providerId);
      if (!provider?.enabled || !provider.buildActionUrl) {
        return;
      }

      await trackShareCreated(providerId);
      const channel = analyticsChannelFromShareAction(providerId);
      openShareDestination(
        provider.buildActionUrl({
          publicPreviewUrl: urlForChannel(channel),
          locale,
          assetType,
        }),
      );
    },
    [assetType, copyLink, locale, trackShareCreated, urlForChannel],
  );

  return {
    locale,
    content,
    copyState,
    canUseNativeShare: canUseNativeShare(),
    isMobileShareContext: isMobileShareContext(),
    sharePrimary,
    shareNative,
    shareWhatsApp,
    shareSms,
    copyLink,
    openProvider,
    trackWhatsAppCta,
    trackDesktopQrShown,
  };
}
