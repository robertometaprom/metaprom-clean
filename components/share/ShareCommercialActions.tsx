"use client";

import { useCallback, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";
import ShareCommercialMenu from "@/components/share/ShareCommercialMenu";
import ShareWhatsAppQrPanel from "@/components/share/ShareWhatsAppQrPanel";
import { useShareCommercial } from "@/lib/share/use-share-commercial";

export type ShareCommercialActionsProps = {
  publicPreviewUrl: string;
  shareSlug: string;
  locale?: Locale;
  variant?: "compact" | "prominent" | "dark" | "text" | "whatsapp";
  /** Overrides the default share label (e.g. REVIEW tertiary action). */
  label?: string;
  className?: string;
};

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
      />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export default function ShareCommercialActions({
  publicPreviewUrl,
  shareSlug,
  locale,
  variant = "compact",
  label,
  className = "",
}: ShareCommercialActionsProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const {
    content,
    isMobileShareContext,
    sharePrimary,
    trackWhatsAppCta,
  } = useShareCommercial({
    publicPreviewUrl,
    shareSlug,
    locale,
  });

  const isWhatsAppVariant = variant === "whatsapp";

  const handleClick = useCallback(async () => {
    if (isWhatsAppVariant) {
      if (isMobileShareContext) {
        // sharePrimary already records review_cta / native|whatsapp growth events
        await sharePrimary();
        return;
      }

      await trackWhatsAppCta("desktop");
      setQrOpen(true);
      return;
    }

    if (isMobileShareContext) {
      await sharePrimary();
      return;
    }

    setMenuOpen((open) => !open);
  }, [
    isMobileShareContext,
    isWhatsAppVariant,
    sharePrimary,
    trackWhatsAppCta,
  ]);

  const buttonClassName =
    variant === "whatsapp"
      ? "share-zone-cta inline-flex w-full items-center justify-center gap-3 rounded-full bg-gradient-to-b from-[#2FE574] to-[#1FBE5A] px-5 py-5 text-[15px] font-bold uppercase tracking-[0.04em] text-white ring-1 ring-white/25 transition hover:from-[#39EB7F] hover:to-[#22C55E] active:scale-[0.985] sm:gap-3.5 sm:py-[1.35rem] sm:text-lg"
      : variant === "prominent"
        ? "w-full rounded-2xl border border-white/15 bg-white/[0.06] py-3.5 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/10 active:scale-[0.98]"
        : variant === "dark"
          ? "flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/10 py-2 text-center text-xs font-semibold text-white transition hover:bg-white/15"
          : variant === "text"
            ? "inline-flex items-center gap-1.5 text-sm font-medium text-white/55 transition hover:text-white/85"
            : "flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 py-2 text-center text-xs font-semibold text-violet-700 transition hover:bg-violet-100";

  const resolvedLabel =
    label ??
    (isWhatsAppVariant ? content.whatsappCta : content.shareCommercial);

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => void handleClick()}
        className={buttonClassName}
      >
        {isWhatsAppVariant ? (
          <WhatsAppIcon className="h-8 w-8 shrink-0 sm:h-9 sm:w-9" />
        ) : (
          <ShareIcon className={variant === "text" ? "h-4 w-4" : "h-3.5 w-3.5"} />
        )}
        <span className={isWhatsAppVariant ? "min-w-0 leading-tight" : undefined}>
          {resolvedLabel}
        </span>
      </button>

      {isWhatsAppVariant ? (
        <ShareWhatsAppQrPanel
          publicPreviewUrl={publicPreviewUrl}
          shareSlug={shareSlug}
          locale={locale}
          open={qrOpen}
          onClose={() => setQrOpen(false)}
        />
      ) : (
        !isMobileShareContext && (
          <ShareCommercialMenu
            publicPreviewUrl={publicPreviewUrl}
            shareSlug={shareSlug}
            locale={locale}
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            anchorRef={buttonRef}
          />
        )
      )}
    </div>
  );
}
