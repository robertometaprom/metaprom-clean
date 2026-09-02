"use client";

import { useRef, useState } from "react";
import LegalNotice from "@/components/legal/LegalNotice";
import {
  executeNewUserHandoff,
  isNewUserHandoffBusy,
  NEW_USER_HANDOFF_ERROR,
  newUserHandoffButtonLabel,
  type NewUserHandoffPhase,
} from "@/lib/studio/new-user-handoff";

type NewUserHandoffProps = {
  /** Persist anonymous draft; must return resume token. */
  persistDraft: () => Promise<string>;
};

export default function NewUserHandoff({ persistDraft }: NewUserHandoffProps) {
  const [phase, setPhase] = useState<NewUserHandoffPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const busy = isNewUserHandoffBusy(phase);

  const handleSave = async () => {
    if (inFlightRef.current || busy) return;

    inFlightRef.current = true;
    setError(null);

    try {
      await executeNewUserHandoff({
        persistDraft,
        onPhase: setPhase,
      });
      // Browser navigates to Google; keep redirecting if redirect is delayed.
    } catch (saveError) {
      console.error(saveError);
      setPhase("error");
      setError(NEW_USER_HANDOFF_ERROR);
      inFlightRef.current = false;
    }
  };

  return (
    <div data-testid="new-user-handoff">
      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={busy}
        aria-busy={busy}
        className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-3.5 text-base font-semibold text-white shadow-lg shadow-violet-900/40 transition hover:from-violet-600 hover:to-purple-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
        data-testid="anonymous-preview-save-cta"
        data-handoff-phase={phase}
      >
        {newUserHandoffButtonLabel(phase)}
      </button>
      {phase === "error" && error ? (
        <p
          className="mt-3 text-center text-sm text-amber-200"
          data-testid="new-user-handoff-error"
        >
          {error}
        </p>
      ) : null}
      <LegalNotice kind="auth" locale="es" className="mt-3" />
    </div>
  );
}
