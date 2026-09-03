"use client";

import { useRef, useState } from "react";
import { buildAuthRedirectUrl } from "@/lib/studio-draft/client";

type PreviewSaveEmailAuthLinkProps = {
  persistDraft: () => Promise<string>;
  label: string;
  preparingLabel: string;
  errorLabel: string;
};

export default function PreviewSaveEmailAuthLink({
  persistDraft,
  label,
  preparingLabel,
  errorLabel,
}: PreviewSaveEmailAuthLinkProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const handleContinue = async () => {
    if (inFlightRef.current || loading) return;

    inFlightRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const resumeToken = await persistDraft();
      const redirectTo = buildAuthRedirectUrl(resumeToken);
      window.location.assign(
        `/login?redirect=${encodeURIComponent(redirectTo)}`,
      );
    } catch (continueError) {
      console.error(continueError);
      setError(errorLabel);
      inFlightRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="mt-3 text-center" data-testid="preview-save-email-auth-link">
      <button
        type="button"
        onClick={() => void handleContinue()}
        disabled={loading}
        className="text-sm text-white/70 underline decoration-white/25 underline-offset-2 transition hover:text-white hover:decoration-white/50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? preparingLabel : label}
      </button>
      {error ? (
        <p className="mt-2 text-sm text-amber-200">{error}</p>
      ) : null}
    </div>
  );
}
