"use client";

import { useEffect, useState } from "react";
import LegalNotice from "@/components/legal/LegalNotice";
import type { PaymentMethod, PaymentProviderId } from "@/lib/payments/types";
import { formatPriceMxn } from "@/lib/pricing";
import type { PurchaseHdResult } from "@/lib/studio-creation";

type CheckoutPaymentMethod = {
  id: PaymentMethod;
  label: string;
};

type CheckoutProvider = {
  id: PaymentProviderId;
  label: string;
  paymentMethods: CheckoutPaymentMethod[];
  startPurchase: (
    paymentMethod: PaymentMethod,
    onStatus: (message: string) => void,
  ) => Promise<PurchaseHdResult>;
};

type CheckoutProps = {
  purchaseId: string | null;
  price: number;
  currency: string;
  provider: CheckoutProvider;
  previewVideoUrl?: string | null;
  isUnlocked?: boolean;
  error?: string | null;
  onSuccess: (result: PurchaseHdResult) => void;
  onCancel: () => void;
};

export default function Checkout({
  purchaseId,
  price,
  currency,
  provider,
  previewVideoUrl,
  isUnlocked = false,
  error,
  onSuccess,
  onCancel,
}: CheckoutProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(
    provider.paymentMethods[0]?.id ?? "card",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(error ?? null);

  useEffect(() => {
    if (error) {
      setMessage(error);
    }
  }, [error]);

  const canPurchase = Boolean(purchaseId) && !isUnlocked;

  const handlePurchase = async () => {
    if (!canPurchase) {
      setMessage("Inicia sesión para comprar tu comercial HD.");
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const result = await provider.startPurchase(selectedMethod, setMessage);
      setMessage(result.message);
      if (result.redirected) {
        return;
      }
      onSuccess(result);
    } catch (purchaseError) {
      const runtimeError =
        purchaseError instanceof Error
          ? `${purchaseError.name}: ${purchaseError.message}`
          : "No pudimos completar la compra.";
      setMessage(runtimeError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-8 rounded-3xl border border-neutral-200 bg-white p-8 shadow-lg">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold text-neutral-900">Comercial HD</h2>
        <p className="text-3xl font-bold text-violet-600">
          {currency === "MXN" ? formatPriceMxn(price, "es") : `${currency} ${price}`}
        </p>
        <p className="text-neutral-500">
          Video comercial de hasta 8 segundos en HD, sin marca de agua, listo para
          publicar.
        </p>
      </div>

      {previewVideoUrl && (
        <div className="relative mx-auto max-w-xs overflow-hidden rounded-2xl border border-neutral-200">
          <video
            src={previewVideoUrl}
            autoPlay
            loop
            muted
            playsInline
            className="aspect-[9/16] w-full object-cover"
          />
          {!isUnlocked && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="rounded-lg bg-black/50 px-3 py-1.5 text-xs font-semibold tracking-widest text-white/80 backdrop-blur-sm">
                METAPROM
              </span>
            </div>
          )}
          <p className="bg-neutral-50 px-4 py-2 text-center text-xs text-neutral-500">
            {isUnlocked
              ? "Comercial HD · sin marca de agua"
              : "Avance gratuito · compra HD para descargar sin marca"}
          </p>
        </div>
      )}

      {!isUnlocked && (
        <div className="space-y-3">
          <p className="text-center text-sm text-neutral-600">
            Elige cómo quieres pagar
          </p>
          <div className="grid grid-cols-2 gap-2">
            {provider.paymentMethods.map((method) => (
              <button
                key={method.id}
                type="button"
                onClick={() => setSelectedMethod(method.id)}
                className={`rounded-xl border py-2.5 text-sm font-semibold transition ${
                  selectedMethod === method.id
                    ? "border-violet-500 bg-violet-50 text-violet-800"
                    : "border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                {method.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handlePurchase}
            disabled={isLoading}
            className="w-full rounded-2xl bg-neutral-900 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Procesando..." : "Produce tu comercial completo"}
          </button>
          <p className="text-center text-xs text-neutral-400">
            Pago procesado por {provider.label}
          </p>
          <LegalNotice kind="checkout" className="text-neutral-400" />
        </div>
      )}

      {message && (
        <p className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-center text-sm text-neutral-700">
          {message}
        </p>
      )}

      <button
        type="button"
        onClick={onCancel}
        className="w-full rounded-2xl border border-neutral-200 py-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
      >
        Volver
      </button>
    </div>
  );
}
