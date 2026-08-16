"use client";

import { useState } from "react";

type Balances = { commercialsRemaining: number; advertisingAssetsRemaining: number };

export default function TestCreditsControl({ initialBalances }: { initialBalances: Balances }) {
  const [kind, setKind] = useState<"commercial" | "advertising_asset">("commercial");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("QA Narrative Fidelity");
  const [balances, setBalances] = useState(initialBalances);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);
    try {
      const response = await fetch("/api/admin/test-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, kind, quantity, reason }),
      });
      const body = await response.json() as { error?: string; granted?: boolean; balances?: Balances };
      if (!response.ok || !body.balances) throw new Error(body.error ?? "No se pudieron acreditar los créditos.");
      setBalances(body.balances);
      setStatus({ type: "success", message: body.granted ? "Créditos de prueba acreditados." : "Esta solicitud ya había sido aplicada; no se duplicó." });
      setRequestId(crypto.randomUUID());
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "No se pudieron acreditar los créditos." });
    } finally {
      setSubmitting(false);
    }
  }

  return <div>
    <div className="mb-5 grid grid-cols-2 gap-3">
      <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4"><p className="text-xs text-white/40">Comerciales</p><p className="mt-1 text-2xl font-semibold">{balances.commercialsRemaining}</p></div>
      <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4"><p className="text-xs text-white/40">Imágenes</p><p className="mt-1 text-2xl font-semibold">{balances.advertisingAssetsRemaining}</p></div>
    </div>
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm text-white/65">Tipo<select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#111118] px-3 py-2.5 text-white"><option value="commercial">Comercial</option><option value="advertising_asset">Imagen publicitaria</option></select></label>
      <label className="block text-sm text-white/65">Cantidad<input type="number" min={1} max={100} step={1} required value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-white/10 bg-[#111118] px-3 py-2.5 text-white" /></label>
      <label className="block text-sm text-white/65">Motivo<input type="text" minLength={3} maxLength={200} required value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#111118] px-3 py-2.5 text-white" /></label>
      <button type="submit" disabled={submitting} className="w-full rounded-xl bg-violet-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-wait disabled:opacity-60">{submitting ? "Acreditando…" : "Acreditar créditos de prueba"}</button>
      {status ? <p role="status" className={`rounded-xl border p-3 text-sm ${status.type === "success" ? "border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-100" : "border-red-300/20 bg-red-300/[0.08] text-red-100"}`}>{status.message}</p> : null}
    </form>
    <p className="mt-4 text-xs leading-5 text-white/35">Grant interno, idempotente y no-revenue. El consumo posterior usa el flujo normal.</p>
  </div>;
}
