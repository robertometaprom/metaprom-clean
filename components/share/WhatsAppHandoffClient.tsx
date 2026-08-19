"use client";

import { useEffect, useState } from "react";
import { trackGrowthEvent } from "@/lib/growth/events";
import { getClientLocale } from "@/lib/share/content";
import type { PublicPreviewKind } from "@/lib/preview/types";
import { buildPublicPreviewUrl } from "@/lib/preview/share-url";
import { buildWhatsAppShareUrl } from "@/lib/share/whatsapp-message";

type WhatsAppHandoffClientProps = {
  shareSlug: string;
};

type PublicPreviewApiResponse = {
  kind?: PublicPreviewKind;
};

/**
 * Thin Metaprom-owned handoff: QR lands here, then opens WhatsApp with the
 * existing public preview message. No premium media, tokens, or checkout.
 */
export default function WhatsAppHandoffClient({
  shareSlug,
}: WhatsAppHandoffClientProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!shareSlug) {
      setFailed(true);
      return;
    }

    let cancelled = false;

    const run = async () => {
      const locale = getClientLocale();
      const publicPreviewUrl = buildPublicPreviewUrl(shareSlug);

      let assetType: PublicPreviewKind = "commercial";
      try {
        const response = await fetch(`/api/public/${encodeURIComponent(shareSlug)}`);
        if (response.ok) {
          const preview = (await response.json()) as PublicPreviewApiResponse;
          if (
            preview.kind === "advertising_image" ||
            preview.kind === "commercial"
          ) {
            assetType = preview.kind;
          }
        }
      } catch {
        // Fall back to commercial copy if preview lookup fails.
      }

      await trackGrowthEvent({
        shareSlug,
        eventType: "share_created",
        metadata: {
          channel: "whatsapp",
          surface: "handoff",
          asset_type: assetType,
        },
      });

      if (cancelled) return;

      const whatsappUrl = buildWhatsAppShareUrl({
        publicPreviewUrl,
        locale,
        assetType,
      });

      window.location.replace(whatsappUrl);
    };

    void run().catch(() => {
      if (!cancelled) setFailed(true);
    });

    return () => {
      cancelled = true;
    };
  }, [shareSlug]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#0b0614] px-6 text-center text-white">
      <div className="max-w-sm space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fuchsia-300/90">
          Metaprom
        </p>
        <p className="text-sm text-white/80">
          {failed
            ? "No se pudo abrir WhatsApp. Vuelve a intentar desde tu vista previa."
            : "Abriendo WhatsApp…"}
        </p>
      </div>
    </main>
  );
}
