"use client";

import { useEffect, useRef } from "react";
import { generate } from "lean-qr";
import type { Locale } from "@/lib/i18n";
import { buildWhatsAppHandoffUrl } from "@/lib/preview/share-url";
import { useShareCommercial } from "@/lib/share/use-share-commercial";

type ShareWhatsAppQrPanelProps = {
  publicPreviewUrl: string;
  shareSlug: string;
  locale?: Locale;
  open: boolean;
  onClose: () => void;
};

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export default function ShareWhatsAppQrPanel({
  publicPreviewUrl,
  shareSlug,
  locale,
  open,
  onClose,
}: ShareWhatsAppQrPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    content,
    copyState,
    shareWhatsApp,
    copyLink,
    trackDesktopQrShown,
  } = useShareCommercial({
    publicPreviewUrl,
    shareSlug,
    locale,
  });

  const trackedOpenRef = useRef(false);
  useEffect(() => {
    if (!open) {
      trackedOpenRef.current = false;
      return;
    }
    if (trackedOpenRef.current) return;
    trackedOpenRef.current = true;
    void trackDesktopQrShown();
  }, [open, trackDesktopQrShown]);

  useEffect(() => {
    if (!open || !canvasRef.current) return;

    const handoffUrl = buildWhatsAppHandoffUrl(shareSlug);
    const qr = generate(handoffUrl);
    qr.toCanvas(canvasRef.current, {
      on: [0x11, 0x11, 0x11],
      off: [0xff, 0xff, 0xff],
      pad: 3,
    });
  }, [open, shareSlug]);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        aria-label={content.closePanel}
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="whatsapp-qr-title"
        className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-[#25D366]/30 bg-[#0b1210]/96 shadow-[0_24px_90px_rgba(0,0,0,0.6),0_0_60px_rgba(37,211,102,0.18)] backdrop-blur-xl"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(37,211,102,0.18)_0%,transparent_55%),radial-gradient(ellipse_at_bottom,rgba(168,85,247,0.12)_0%,transparent_50%)]" />

        <div className="relative px-5 pb-6 pt-5 sm:px-6">
          <div className="mb-1 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/15 bg-white/5 p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label={content.closePanel}
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="text-center">
            <div className="mb-3 inline-flex items-center justify-center rounded-full bg-[#25D366]/15 p-2.5 text-[#25D366] ring-1 ring-[#25D366]/35">
              <WhatsAppGlyph className="h-7 w-7" />
            </div>
            <h2
              id="whatsapp-qr-title"
              className="text-[clamp(1.55rem,5vw,2rem)] font-black uppercase leading-tight tracking-tight text-white"
              style={{
                textShadow:
                  "0 0 18px rgba(37,211,102,0.45), 0 0 36px rgba(168,85,247,0.28)",
              }}
            >
              {content.whatsappQrInstruction}
            </h2>
            <p className="mt-2 text-sm font-medium text-white/80 sm:text-[15px]">
              {content.whatsappQrHint}
            </p>
          </div>

          <div className="mx-auto mt-5 flex w-fit items-center justify-center rounded-2xl bg-white p-3.5 shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_0_40px_rgba(37,211,102,0.22)]">
            <canvas
              ref={canvasRef}
              className="h-[240px] w-[240px] sm:h-[260px] sm:w-[260px]"
              style={{ imageRendering: "pixelated" }}
              aria-label={content.whatsappQrHint}
            />
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => void shareWhatsApp("desktop_qr")}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#25D366]/35 bg-[#25D366]/12 px-4 py-3.5 text-sm font-semibold text-white transition hover:border-[#25D366]/55 hover:bg-[#25D366]/20"
            >
              <WhatsAppGlyph className="h-5 w-5 text-[#25D366]" />
              {content.whatsappOpenOnDesktop}
            </button>
            <button
              type="button"
              onClick={() => void copyLink("desktop_qr")}
              className="inline-flex w-full items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-medium text-white/65 transition hover:text-white/90"
            >
              {copyState === "success"
                ? content.copyLinkSuccess
                : copyState === "error"
                  ? content.copyLinkError
                  : content.copyLink}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
