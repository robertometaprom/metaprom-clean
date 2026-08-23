"use client";

import { useCallback, useEffect, useState } from "react";

import CreativeDirector from "@/components/studio/CreativeDirector";
import Biblioteca from "@/components/biblioteca/Biblioteca";
import StudioShell, { useStudioAuth } from "@/components/studio/StudioShell";
import type { PaymentProviderDisplayMetadata } from "@/lib/payments";
import {
  clearBibliotecaQueryFromUrl,
  readBibliotecaFocusFromLocation,
  type BibliotecaFocus,
} from "@/lib/biblioteca-routing";
import type { Locale, Messages } from "@/lib/i18n";

type StudioPageClientProps = {
  paymentProviderDisplay: PaymentProviderDisplayMetadata;
  locale: Locale;
  nav: Messages["nav"];
  showAnalyticsNav?: boolean;
};

export default function StudioPageClient({
  paymentProviderDisplay,
  locale,
  nav,
  showAnalyticsNav = false,
}: StudioPageClientProps) {
  const { user: authUser, ready: authReady } = useStudioAuth();
  const [isWelcome, setIsWelcome] = useState(true);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryFocus, setLibraryFocus] = useState<BibliotecaFocus | null>(null);
  const [libraryRefreshToken, setLibraryRefreshToken] = useState(0);
  const [libraryResetToListToken, setLibraryResetToListToken] = useState(0);

  useEffect(() => {
    const focus = readBibliotecaFocusFromLocation();

    if (focus) {
      setLibraryFocus(focus);
      setLibraryOpen(true);
      setLibraryRefreshToken((current) => current + 1);
      clearBibliotecaQueryFromUrl();
    }
  }, []);

  const handleOpenLibrary = useCallback((focus?: BibliotecaFocus) => {
    if (focus?.projectId) {
      setLibraryFocus(focus);
    } else {
      setLibraryFocus(null);
      setLibraryResetToListToken((current) => current + 1);
    }
    setLibraryOpen(true);
    setLibraryRefreshToken((current) => current + 1);
  }, []);

  const handleCloseLibrary = useCallback(() => {
    setLibraryOpen(false);
    setLibraryFocus(null);
  }, []);

  const handleClearLibraryFocus = useCallback(() => {
    setLibraryFocus(null);
  }, []);

  const handleLibraryUpdated = useCallback((focus?: BibliotecaFocus) => {
    if (focus?.projectId) {
      setLibraryFocus(focus);
    }
    setLibraryRefreshToken((current) => current + 1);
  }, []);

  return (
    <StudioShell
      variant={isWelcome ? "welcome" : "flow"}
      onOpenLibrary={() => handleOpenLibrary()}
      authUser={authUser}
      locale={locale}
      nav={nav}
      showAnalyticsNav={showAnalyticsNav}
    >
      <CreativeDirector
        paymentProviderDisplay={paymentProviderDisplay}
        onWelcomeChange={setIsWelcome}
        libraryOpen={libraryOpen}
        onOpenLibrary={handleOpenLibrary}
        onLibraryUpdated={handleLibraryUpdated}
        chrome={{
          signIn: nav.signIn,
          signUp: nav.signUp,
        }}
      />
      <Biblioteca
        open={libraryOpen}
        onClose={handleCloseLibrary}
        focusProjectId={libraryFocus?.projectId}
        focusAssetId={libraryFocus?.assetId}
        refreshToken={libraryRefreshToken}
        resetToListToken={libraryResetToListToken}
        onClearFocus={handleClearLibraryFocus}
        authUser={authUser}
        authReady={authReady}
      />
    </StudioShell>
  );
}
