import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isMetapromAdmin } from "@/lib/admin/authorization";
import { getDashboardData, type DashboardRange } from "@/lib/admin/dashboard-data";
import TestCreditsControl from "@/components/admin/TestCreditsControl";
import { getEntitlementBalances } from "@/lib/entitlements";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Business Dashboard — Metaprom AI" };
export const dynamic = "force-dynamic";

const ranges: Array<{ value: DashboardRange; label: string }> = [
  { value: "today", label: "Hoy" },
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
  { value: "all", label: "Todo" },
];

function money(value: number | null) {
  if (value === null) return "No disponible";
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(value);
}

function Kpi({ label, value, note }: { label: string; value: string | number; note: string }) {
  return <article className="rounded-[1.75rem] border border-white/10 bg-white/[0.055] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl"><p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300/80">{label}</p><p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p><p className="mt-2 text-sm leading-6 text-white/50">{note}</p></article>;
}

function MetricRow({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return <div className="flex items-start justify-between gap-4 border-b border-white/8 py-3 last:border-0"><div><p className="text-sm text-white/75">{label}</p>{hint ? <p className="mt-1 text-xs leading-5 text-white/35">{hint}</p> : null}</div><p className="shrink-0 text-sm font-semibold text-white">{value}</p></div>;
}

function Section({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return <section className="rounded-[2rem] border border-white/10 bg-black/35 p-6 md:p-7"><p className="text-xs uppercase tracking-[0.22em] text-cyan-300/70">{eyebrow}</p><h2 className="mt-2 text-xl font-semibold text-white">{title}</h2><div className="mt-5">{children}</div></section>;
}

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/dashboard");
  if (!isMetapromAdmin(user)) redirect("/studio");

  const requestedRange = (await searchParams).range;
  const range: DashboardRange = ranges.some((item) => item.value === requestedRange) ? requestedRange as DashboardRange : "all";
  const [data, adminBalances] = await Promise.all([
    getDashboardData(range),
    getEntitlementBalances(createAdminClient(), user.id),
  ]);

  return <main className="min-h-screen bg-[#050508] text-white"><div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(124,58,237,0.18),transparent_35%),radial-gradient(circle_at_90%_20%,rgba(6,182,212,0.10),transparent_30%)]" /><div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12">
    <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between"><div><Link href="/studio" className="text-sm text-white/45 transition hover:text-white">← Volver al Estudio</Link><p className="mt-7 text-xs uppercase tracking-[0.28em] text-violet-300">Metaprom AI · interno</p><h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Business Dashboard</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/50">Lectura ejecutiva de fuentes canónicas. Datos de prueba e históricos nunca se presentan como ingresos reales.</p></div><nav className="flex flex-wrap gap-2" aria-label="Rango de tiempo">{ranges.map((item) => <Link key={item.value} href={`/admin/dashboard?range=${item.value}`} className={`rounded-full border px-4 py-2 text-sm transition ${range === item.value ? "border-violet-300/50 bg-violet-400/15 text-white" : "border-white/10 bg-white/5 text-white/50 hover:text-white"}`}>{item.label}</Link>)}</nav></header>

    <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Kpi label="Ingresos confirmados" value={money(data.commerce.revenueMxn)} note="Sólo compras Stripe completadas" /><Kpi label="Compras confirmadas" value={data.commerce.confirmedPurchases} note={`Ticket promedio: ${money(data.commerce.averageOrderMxn)}`} /><Kpi label="Registros Auth no-test" value={data.usage.nonTestAuthRecords} note={`${data.usage.rawAuthRecords} brutos · ${data.usage.excludedTestAuthRecords} test excluidos · ${data.usage.pendingIdentityClassification} por clasificar`} /><Kpi label="Resultados guardados" value={data.usage.assets} note={`${data.usage.imageGenerations} generaciones de imagen`} /></div>

    <div className="mt-6 grid gap-6 lg:grid-cols-2"><Section eyebrow="Commerce" title="Ingresos y pagos"><MetricRow label="Comerciales" value={money(data.commerce.revenueByCategory.commercials)} /><MetricRow label="Imágenes publicitarias" value={money(data.commerce.revenueByCategory.images)} /><MetricRow label="Pagados" value={data.commerce.statusCounts.completed} /><MetricRow label="Esperando pago" value={data.commerce.statusCounts.awaiting_payment} /><MetricRow label="Fallidos" value={data.commerce.statusCounts.failed} /><div className="mt-4 rounded-2xl border border-amber-300/15 bg-amber-300/[0.06] p-4 text-xs leading-5 text-amber-100/65">El método almacenado no es confiable para distinguir OXXO: el registro existente puede aparecer como tarjeta. Se muestra el estado, pero no se usa ese campo para decisiones.</div></Section>
    <Section eyebrow="Entitlements" title="Créditos y saldos"><MetricRow label="Créditos pagados · comerciales" value={data.credits.paidGranted.commercials} /><MetricRow label="Créditos pagados · imágenes" value={data.credits.paidGranted.images} /><MetricRow label="Consumidos · comerciales" value={data.credits.consumed.commercials} /><MetricRow label="Consumidos · imágenes" value={data.credits.consumed.images} /><MetricRow label="Saldo total · comerciales" value={data.credits.outstanding.commercials} /><MetricRow label="Saldo total · imágenes" value={data.credits.outstanding.images} /><MetricRow label="Grants históricos/test" value={`${data.credits.historicalOrTestGranted.commercials} com. · ${data.credits.historicalOrTestGranted.images} img.`} hint="Separados mediante proveedor, compra vinculada y metadata del ledger; no son ingreso." /></Section></div>

    <div className="mt-6 max-w-xl"><Section eyebrow="QA interno" title="Créditos de prueba"><TestCreditsControl initialBalances={{ commercialsRemaining: adminBalances.commercialsRemaining, advertisingAssetsRemaining: adminBalances.advertisingAssetsRemaining }} /></Section></div>

    <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"><Section eyebrow="Product" title="Uso registrado"><MetricRow label="Proyectos creados" value={data.usage.projects} /><MetricRow label="Assets guardados" value={data.usage.assets} /><MetricRow label="Imágenes generadas" value={data.usage.imageGenerations} /><MetricRow label="Previews de video" value={data.usage.previews} /><MetricRow label="Completados premium" value={data.usage.premiumCompletions} /></Section><Section eyebrow="Funnel" title="Embudo defendible"><div className="space-y-3">{[["Registros Auth no-test",data.funnel.users],["Usuarios con generación guardada",data.funnel.usersWithGeneration],["Usuarios con checkout Stripe",data.funnel.usersWithCheckout],["Compradores confirmados",data.funnel.confirmedBuyers]].map(([label,value],index)=><div key={String(label)} className="rounded-2xl border border-white/8 bg-white/[0.035] p-4"><div className="flex items-center justify-between gap-4"><span className="text-sm text-white/65">{index+1}. {label}</span><strong className="text-lg">{value}</strong></div></div>)}</div><p className="mt-4 text-xs leading-5 text-white/35">Se excluyen cuentas automatizadas de prueba. Quedan {data.usage.pendingIdentityClassification} registros no-test con identidad pendiente; este embudo no implica visitantes anónimos ni conversión de landing.</p></Section></div>

    <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]"><Section eyebrow="Activity" title="Compras confirmadas recientes">{data.commerce.recent.length ? <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead className="text-xs uppercase tracking-wider text-white/35"><tr><th className="pb-3">Compra</th><th className="pb-3">Producto</th><th className="pb-3">Importe</th><th className="pb-3">Fecha</th></tr></thead><tbody>{data.commerce.recent.map((purchase)=><tr key={purchase.id} className="border-t border-white/8"><td className="py-3">#{purchase.id}</td><td className="py-3 text-white/65">{purchase.productId}</td><td className="py-3">{money(purchase.amountMxn)}</td><td className="py-3 text-white/50">{new Intl.DateTimeFormat("es-MX",{dateStyle:"medium"}).format(new Date(purchase.createdAt))}</td></tr>)}</tbody></table></div> : <p className="rounded-2xl border border-dashed border-white/10 p-6 text-sm leading-6 text-white/45">No hay compras Stripe confirmadas en este rango. Las compras mock/test no aparecen aquí.</p>}</Section><Section eyebrow="Instrumentation" title="Lo que aún falta"><MetricRow label="Tráfico anónimo / landing" value="No disponible" /><MetricRow label="UTM y atribución social" value="No disponible" /><MetricRow label="Abandono de checkout" value="No disponible" /><MetricRow label="Costo y margen por generación" value="No disponible" /><p className="mt-4 text-xs leading-5 text-white/35">Registrar eventos server-side y, por generación, proveedor, modelo, operación, unidades facturables, costo, moneda y estado.</p></Section></div>
    <p className="mt-6 text-right text-xs text-white/25">Actualizado {new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(data.generatedAt))}</p>
  </div></main>;
}
