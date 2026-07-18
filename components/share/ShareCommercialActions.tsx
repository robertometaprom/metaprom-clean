"use client";

import { useCallback, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";
import ShareCommercialMenu from "@/components/share/ShareCommercialMenu";
import { useShareCommercial } from "@/lib/share/use-share-commercial";

export type ShareCommercialActionsProps = {
  publicPreviewUrl: string;
  shareSlug: string;
  locale?: Locale;
  variant?: "compact" | "prominent" | "dark";
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

export default function ShareCommercialActions({
  publicPreviewUrl,
  shareSlug,
  locale,
  variant = "compact",
  className = "",
}: ShareCommercialActionsProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { content, isMobileShareContext, sharePrimary } = useShareCommercial({
    publicPreviewUrl,
    shareSlug,
    locale,
  });

  const handleClick = useCallback(async () => {
    if (isMobileShareContext) {
      await sharePrimary();
      return;
    }

    setMenuOpen((open) => !open);
  }, [isMobileShareContext, sharePrimary]);

  const buttonClassName =
    variant === "prominent"
      ? "w-full rounded-2xl border border-white/15 bg-white/[0.06] py-3.5 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/10 active:scale-[0.98]"
      : variant === "dark"
        ? "flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/10 py-2 text-center text-xs font-semibold text-white transition hover:bg-white/15"
        : "flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 py-2 text-center text-xs font-semibold text-violet-700 transition hover:bg-violet-100";

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => void handleClick()}
        className={buttonClassName}
      >
        <ShareIcon className="h-3.5 w-3.5" />
        {content.shareCommercial}
      </button>

      {!isMobileShareContext && (
        <ShareCommercialMenu
          publicPreviewUrl={publicPreviewUrl}
          shareSlug={shareSlug}
          locale={locale}
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          anchorRef={buttonRef}
        />
      )}
    </div>
  );
}
