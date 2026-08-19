"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";
import type { PublicPreviewKind } from "@/lib/preview/types";
import { getEnabledShareProviders, type ShareProviderId } from "@/lib/share/providers";
import { useShareCommercial } from "@/lib/share/use-share-commercial";

type ShareCommercialMenuProps = {
  publicPreviewUrl: string;
  shareSlug: string;
  locale?: Locale;
  assetType?: PublicPreviewKind;
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
};

function providerLabel(
  providerId: ShareProviderId,
  content: ReturnType<typeof useShareCommercial>["content"],
): string {
  switch (providerId) {
    case "whatsapp":
      return content.whatsapp;
    case "copy_link":
      return content.copyLink;
    case "sms":
      return content.sms;
    case "facebook":
      return content.facebook;
    case "linkedin":
      return content.linkedin;
    case "x":
      return content.x;
    case "email":
      return content.email;
    default:
      return providerId;
  }
}

export default function ShareCommercialMenu({
  publicPreviewUrl,
  shareSlug,
  locale,
  assetType = "commercial",
  open,
  onClose,
  anchorRef,
}: ShareCommercialMenuProps) {
  const { content, copyState, openProvider, locale: resolvedLocale } = useShareCommercial({
    publicPreviewUrl,
    shareSlug,
    locale,
    assetType,
  });
  const menuRef = useRef<HTMLDivElement>(null);
  const providers = getEnabledShareProviders(resolvedLocale);

  const handleProviderClick = useCallback(
    async (providerId: ShareProviderId) => {
      await openProvider(providerId);
      if (providerId !== "copy_link") {
        onClose();
      }
    },
    [onClose, openProvider],
  );

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [anchorRef, onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40"
        aria-label={content.closeMenu}
        onClick={onClose}
      />
      <div
        ref={menuRef}
        className="absolute bottom-full left-0 z-50 mb-2 min-w-[180px] overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-lg"
      >
        {providers.map((provider) => (
          <button
            key={provider.id}
            type="button"
            className="block w-full px-4 py-2.5 text-left text-sm text-neutral-700 transition hover:bg-neutral-50"
            onClick={() => void handleProviderClick(provider.id)}
          >
            {provider.id === "copy_link" && copyState === "success"
              ? content.copyLinkSuccess
              : provider.id === "copy_link" && copyState === "error"
                ? content.copyLinkError
                : providerLabel(provider.id, content)}
          </button>
        ))}
      </div>
    </>
  );
}
