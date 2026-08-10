"use client";

import { useCallback, useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { trackGrowthEvent } from "@/lib/growth/events";
import type { PublicPreviewKind } from "@/lib/preview/types";
import { getClientLocale, getShareCommercialContent } from "@/lib/share/content";
import {
  getShareProvider,
  type ShareProviderId,
} from "@/lib/share/providers";
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

  const trackShare = useCallback(
    async (
      action: ShareCommercialAction | "desktop_qr_shown" | "desktop_qr_handoff",
      surface?: ShareGrowthSurface,
    ) => {
      const eventType =
        action === "copy_link"
          ? "share_copy"
          : action === "whatsapp"
            ? "share_whatsapp"
            : "share";

      await trackGrowthEvent({
        shareSlug,
        eventType,
        metadata: {
          channel: action,
          ...assetTypeMetadata,
          ...(surface ? { surface } : {}),
        },
      });
    },
    [assetTypeMetadata, shareSlug],
  );

  const trackWhatsAppCta = useCallback(
    async (device: "mobile" | "desktop") => {
      await trackGrowthEvent({
        shareSlug,
        eventType: "share_whatsapp",
        metadata: {
          channel: "whatsapp",
          surface: "review_cta",
          device,
          ...assetTypeMetadata,
        },
      });
    },
    [assetTypeMetadata, shareSlug],
  );

  const trackDesktopQrShown = useCallback(async () => {
    await trackShare("desktop_qr_shown", "desktop_qr");
  }, [trackShare]);

  const shareWhatsApp = useCallback(
    async (surface: ShareGrowthSurface = "menu") => {
      await trackShare("whatsapp", surface);
      const url = buildWhatsAppShareUrl({
        publicPreviewUrl,
        locale,
        assetType,
      });
      window.open(url, "_blank", "noopener,noreferrer");
    },
    [assetType, locale, publicPreviewUrl, trackShare],
  );

  const copyLink = useCallback(
    async (surface: ShareGrowthSurface = "menu") => {
      const copied = await copyTextToClipboard(publicPreviewUrl);
      setCopyState(copied ? "success" : "error");

      if (copied) {
        await trackShare("copy_link", surface);
      }

      window.setTimeout(() => setCopyState("idle"), 2000);
      return copied;
    },
    [publicPreviewUrl, trackShare],
  );

  const shareNative = useCallback(async () => {
    if (!canUseNativeShare()) {
      await shareWhatsApp("review_cta");
      return "whatsapp" as const;
    }

    const message = buildWhatsAppShareMessage({
      publicPreviewUrl,
      locale,
      assetType,
    });

    try {
      await navigator.share({
        title: "Metaprom",
        text: message.split("\n")[0],
        url: publicPreviewUrl,
      });
      await trackShare("native", "review_cta");
      return "native" as const;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return null;
      }

      await shareWhatsApp("review_cta");
      return "whatsapp" as const;
    }
  }, [assetType, locale, publicPreviewUrl, shareWhatsApp, trackShare]);

  const sharePrimary = useCallback(async () => {
    if (isMobileShareContext() && canUseNativeShare()) {
      return shareNative();
    }

    if (isMobileShareContext()) {
      await shareWhatsApp("review_cta");
      return "whatsapp" as const;
    }

    return null;
  }, [shareNative, shareWhatsApp]);

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

      if (provider.growthEventType) {
        await trackGrowthEvent({
          shareSlug,
          eventType: provider.growthEventType,
          metadata: { channel: providerId, ...assetTypeMetadata },
        });
      }

      const url = provider.buildActionUrl({
        publicPreviewUrl,
        locale,
        assetType,
      });
      window.open(url, "_blank", "noopener,noreferrer");
    },
    [assetType, assetTypeMetadata, copyLink, locale, publicPreviewUrl, shareSlug],
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
    copyLink,
    openProvider,
    trackWhatsAppCta,
    trackDesktopQrShown,
  };
}
