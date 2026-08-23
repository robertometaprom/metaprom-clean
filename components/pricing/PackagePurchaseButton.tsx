"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LegalNotice from "@/components/legal/LegalNotice";
import type { Locale } from "@/lib/i18n";

type PackagePurchaseButtonProps = {
  productKey: string;
  label: string;
  enabled: boolean;
  locale?: Locale;
};

export default function PackagePurchaseButton({
  productKey,
  label,
  enabled,
  locale = "es",
}: PackagePurchaseButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePurchase() {
    if (!enabled || busy) return;

    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productKey }),
      });

      const data = (await response.json()) as {
        error?: string;
        redirectUrl?: string;
        status?: string;
        sessionId?: string;
      };

      if (response.status === 401) {
        router.push(`/login?redirect=${encodeURIComponent("/planes")}`);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo iniciar el pago.");
      }

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }

      // Mock provider: no hosted redirect — go to purchase status page.
      if (data.sessionId) {
        router.push(
          `/planes/compra?payment=${data.status === "completed" ? "success" : "pending"}&session_id=${encodeURIComponent(data.sessionId)}`,
        );
        return;
      }

      throw new Error("Checkout incompleto: falta URL de Stripe.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de checkout.");
      setBusy(false);
    }
  }

  return (
    <div className="mt-8">
      <button
        type="button"
        disabled={!enabled || busy}
        aria-disabled={!enabled || busy}
        onClick={handlePurchase}
        className={`inline-flex w-full items-center justify-center rounded-full px-6 py-3.5 text-sm font-medium transition ${
          enabled
            ? "bg-[#F5F5F0] text-black hover:bg-white disabled:opacity-70"
            : "cursor-not-allowed border border-white/15 bg-transparent text-white/45"
        }`}
      >
        {busy ? "Redirigiendo…" : label}
      </button>
      {error ? (
        <p className="mt-3 text-center text-xs text-red-300/90" role="alert">
          {error}
        </p>
      ) : null}
      {enabled ? (
        <LegalNotice kind="checkout" locale={locale} className="mt-3" />
      ) : null}
    </div>
  );
}
