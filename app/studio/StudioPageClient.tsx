"use client";

import { useCallback, useEffect, useState } from "react";

import CreativeDirector from "@/components/studio/CreativeDirector";
import Biblioteca from "@/components/biblioteca/Biblioteca";
import StudioShell from "@/components/studio/StudioShell";
import type { PaymentProviderDisplayMetadata } from "@/lib/payments";
import {
  clearBibliotecaQueryFromUrl,
  readBibliotecaFocusFromLocation,
  type BibliotecaFocus,
} from "@/lib/biblioteca-routing";

type StudioPageClientProps = {
  paymentProviderDisplay: PaymentProviderDisplayMetadata;
};

export default function StudioPageClient({
  paymentProviderDisplay,
}: StudioPageClientProps) {
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
    >
      <CreativeDirector
        paymentProviderDisplay={paymentProviderDisplay}
        onWelcomeChange={setIsWelcome}
        onOpenLibrary={handleOpenLibrary}
        onLibraryUpdated={handleLibraryUpdated}
      />
      <Biblioteca
        open={libraryOpen}
        onClose={handleCloseLibrary}
        focusProjectId={libraryFocus?.projectId}
        focusAssetId={libraryFocus?.assetId}
        refreshToken={libraryRefreshToken}
        resetToListToken={libraryResetToListToken}
        onClearFocus={handleClearLibraryFocus}
      />
    </StudioShell>
  );
}
