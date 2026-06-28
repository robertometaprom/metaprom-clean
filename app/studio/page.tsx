"use client";

import { useState } from "react";
import CreativeDirector from "@/components/studio/CreativeDirector";
import StudioLibrary from "@/components/studio/StudioLibrary";
import StudioShell from "@/components/studio/StudioShell";

export default function StudioPage() {
  const [isWelcome, setIsWelcome] = useState(true);
  const [libraryOpen, setLibraryOpen] = useState(false);

  return (
    <StudioShell
      variant={isWelcome ? "welcome" : "flow"}
      onOpenLibrary={() => setLibraryOpen(true)}
    >
      <CreativeDirector onWelcomeChange={setIsWelcome} />
      <StudioLibrary open={libraryOpen} onClose={() => setLibraryOpen(false)} />
    </StudioShell>
  );
}
