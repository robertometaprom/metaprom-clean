import type { ReactNode } from "react";
import type {
  AnalyticsDashboard,
  AnalyticsPeriod,
  BiggestOpportunity,
  ChannelRow,
  FunnelStep,
  FunnelStepId,
  GenerationRow,
  ShareChannelRow,
} from "@/lib/analytics/dashboard-types";
import {
  UNATTRIBUTED_CHANNEL,
  UNATTRIBUTED_CHANNEL_LABEL,
} from "@/lib/analytics/dashboard-types";

const OPPORTUNITY_SAMPLE_UNITS: Record<FunnelStepId, string> = {
  visitors: "visitors",
  signups: "signups",
  creation_started: "creation starts",
  creation_completed: "completed creations",
  preview_viewed: "previews",
  shares_created: "shares",
  share_opens: "share opens",
  share_cta_clicks: "CTA clicks",
  attributed_signups: "attributed signups",
  premium: "premium activations",
};

const PERIODS: Array<{ value: AnalyticsPeriod; label: string }> = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "all", label: "All time" },
];

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatRate(value: number | null, digits = 1): string {
  if (value === null) return "INSUFFICIENT DATA";
  return `${(value * 100).toFixed(digits)}%`;
}

function formatRatio(value: number | null, digits = 2): string {
  if (value === null) return "INSUFFICIENT DATA";
  return value.toFixed(digits);
}

function formatK(value: number | null): string {
  if (value === null) return "INSUFFICIENT DATA";
  return value.toFixed(3);
}

function formatMoneyMxn(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatActivityTime(iso: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(date);
}

function channelLabel(channel: string): string {
  if (channel === UNATTRIBUTED_CHANNEL) return UNATTRIBUTED_CHANNEL_LABEL;
  return channel.replaceAll("_", " ");
}

function RateText({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <span className="inline-block max-w-full whitespace-normal break-words text-[11px] uppercase leading-snug tracking-wide text-white/35">
        INSUFFICIENT DATA
      </span>
    );
  }
  return <span className="tabular-nums text-white/70">{formatRate(value)}</span>;
}

function Kpi({
  label,
  value,
  rate,
  rateLabel,
}: {
  label: string;
  value: string;
  rate?: number | null;
  rateLabel?: string;
}) {
  return (
    <article className="min-w-0 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-violet-300/80">{label}</p>
      <p
        className={
          value === "INSUFFICIENT DATA"
            ? "mt-1 whitespace-normal break-words text-sm font-semibold uppercase leading-snug tracking-wide text-white/70"
            : "mt-1 truncate text-2xl font-semibold tabular-nums tracking-tight text-white"
        }
      >
        {value}
      </p>
      {rate !== undefined ? (
        <p className="mt-0.5 flex min-w-0 flex-col gap-0.5 text-xs leading-snug text-white/45">
          {rateLabel ? <span>{rateLabel}</span> : null}
          <RateText value={rate} />
        </p>
      ) : null}
    </article>
  );
}

function FunnelView({ steps, leakTo }: { steps: FunnelStep[]; leakTo: string | null }) {
  const peak = Math.max(1, ...steps.map((step) => step.count));
  return (
    <ol className="space-y-2">
      {steps.map((step, index) => {
        const width = Math.max(step.count > 0 ? 6 : 0, (step.count / peak) * 100);
        const isLeak = leakTo === step.id;
        return (
          <li key={step.id}>
            {index > 0 ? (
              step.conversionFromPrevious === null ? (
                <p className="mb-1.5 pl-1 text-xs text-white/25" title="Previous step has no observations">
                  —
                </p>
              ) : (
                <p
                  className={`mb-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 pl-1 text-xs ${
                    isLeak ? "text-amber-200" : "text-white/45"
                  }`}
                >
                  <span className="tabular-nums font-medium">
                    {formatRate(step.conversionFromPrevious)}
                  </span>
                  <span>conversion</span>
                  <span className="text-white/25">·</span>
                  <span className="tabular-nums">
                    {formatRate(step.dropOffFromPrevious)} drop-off
                  </span>
                </p>
              )
            ) : null}
            <div
              className={`rounded-lg border px-3 py-2 ${
                isLeak
                  ? "border-amber-300/40 bg-amber-300/[0.08]"
                  : "border-white/8 bg-white/[0.035]"
              }`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-white/70">{step.label}</span>
                <strong className="text-lg tabular-nums text-white">{formatCount(step.count)}</strong>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8">
                <div
                  className={`h-full rounded-full ${isLeak ? "bg-amber-300" : "bg-cyan-300/80"}`}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Opportunity({ opportunity }: { opportunity: BiggestOpportunity }) {
  return (
    <section className="rounded-xl border border-amber-300/35 bg-amber-300/[0.08] px-4 py-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-amber-200/80">
        Biggest opportunity
      </p>
      {opportunity.status === "insufficient" ? (
        <p className="mt-2 text-lg font-semibold uppercase tracking-wide text-white/50">
          INSUFFICIENT DATA
        </p>
      ) : (
        <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <p className="text-xl font-semibold tracking-tight text-white">{opportunity.label}</p>
          <p className="text-2xl font-semibold tabular-nums text-amber-100">
            {formatRate(opportunity.conversion)}
          </p>
        </div>
      )}
      {opportunity.status === "ok" && opportunity.lowSample ? (
        <p className="mt-1 text-xs text-amber-100/80">
          <span className="font-medium uppercase tracking-[0.14em]">Low sample</span>
          {" — "}
          {formatCount(opportunity.denominator)} {OPPORTUNITY_SAMPLE_UNITS[opportunity.fromId]}
        </p>
      ) : null}
      <p className="mt-1 text-xs text-white/50">Lowest conversion in the current funnel.</p>
    </section>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 border-b border-white/8 py-2 last:border-0">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-white/60">{label}</p>
        <p className="shrink-0 text-sm font-semibold tabular-nums text-white">{value}</p>
      </div>
    </div>
  );
}

function ScrollTable({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-w-0">
      <p className="mb-1.5 text-[11px] text-white/35 md:hidden">Swipe horizontally →</p>
      <div className="relative min-w-0">
        <div className="min-w-0 overflow-x-auto">{children}</div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-7 bg-gradient-to-l from-black to-transparent md:hidden"
        />
      </div>
    </div>
  );
}

function ChannelTable({ rows }: { rows: ChannelRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-white/40">No channel observations in this period.</p>;
  }
    return (
    <ScrollTable>
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="text-[10px] uppercase tracking-[0.14em] text-white/35">
          <tr>
            <th className="pb-2 pr-3 font-medium">Channel</th>
            <th className="pb-2 pr-3 font-medium">Visitors</th>
            <th className="pb-2 pr-3 font-medium">Signups</th>
            <th className="pb-2 pr-3 font-medium">Creators</th>
            <th className="pb-2 pr-3 font-medium">Shares</th>
            <th className="pb-2 pr-3 font-medium">Opens</th>
            <th className="pb-2 pr-3 font-medium">CTA</th>
            <th className="pb-2 pr-3 font-medium">Premium</th>
            <th className="pb-2 pr-3 font-medium">Visit→Signup</th>
            <th className="pb-2 font-medium">Signup→Premium</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.channel} className="border-t border-white/8">
              <td
                className={`py-2 pr-3 font-medium text-white ${
                  row.channel === UNATTRIBUTED_CHANNEL ? "" : "capitalize"
                }`}
              >
                {channelLabel(row.channel)}
              </td>
              <td className="py-2 pr-3 tabular-nums">{formatCount(row.visitors)}</td>
              <td className="py-2 pr-3 tabular-nums">{formatCount(row.signups)}</td>
              <td className="py-2 pr-3 tabular-nums">{formatCount(row.creators)}</td>
              <td className="py-2 pr-3 tabular-nums">{formatCount(row.shares)}</td>
              <td className="py-2 pr-3 tabular-nums">{formatCount(row.shareOpens)}</td>
              <td className="py-2 pr-3 tabular-nums">{formatCount(row.ctaClicks)}</td>
              <td className="py-2 pr-3 tabular-nums">{formatCount(row.premium)}</td>
              <td className="py-2 pr-3 tabular-nums text-white/70">{formatRate(row.visitToSignup)}</td>
              <td className="py-2 tabular-nums text-white/70">{formatRate(row.signupToPremium)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollTable>
  );
}

function ShareChannelTable({ rows }: { rows: ShareChannelRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-white/40">No Share-channel observations in this period.</p>;
  }
    return (
    <ScrollTable>
      <table className="w-full min-w-[920px] text-left text-sm">
        <thead className="text-[10px] uppercase tracking-[0.14em] text-white/35">
          <tr>
            <th className="pb-2 pr-3 font-medium">Channel</th>
            <th className="pb-2 pr-3 font-medium">Shares</th>
            <th className="pb-2 pr-3 font-medium">Opens</th>
            <th className="pb-2 pr-3 font-medium">Unique visitors</th>
            <th className="pb-2 pr-3 font-medium">Opens/Share</th>
            <th className="pb-2 pr-3 font-medium">CTA</th>
            <th className="pb-2 pr-3 font-medium">CTA CTR</th>
            <th className="pb-2 pr-3 font-medium">Signups</th>
            <th className="pb-2 pr-3 font-medium">Signup conv.</th>
            <th className="pb-2 pr-3 font-medium">Premium</th>
            <th className="pb-2 font-medium">Premium conv.</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.channel} className="border-t border-white/8">
              <td
                className={`py-2 pr-3 font-medium text-white ${
                  row.channel === UNATTRIBUTED_CHANNEL ? "" : "capitalize"
                }`}
              >
                {channelLabel(row.channel)}
              </td>
              <td className="py-2 pr-3 tabular-nums">{formatCount(row.shares)}</td>
              <td className="py-2 pr-3 tabular-nums">{formatCount(row.opens)}</td>
              <td className="py-2 pr-3 tabular-nums">
                {row.uniqueVisitors === null ? "INSUFFICIENT DATA" : formatCount(row.uniqueVisitors)}
              </td>
              <td className="py-2 pr-3 tabular-nums text-white/70">{formatRatio(row.opensPerShare)}</td>
              <td className="py-2 pr-3 tabular-nums">{formatCount(row.ctaClicks)}</td>
              <td className="py-2 pr-3 tabular-nums text-white/70">{formatRate(row.ctaCtr)}</td>
              <td className="py-2 pr-3 tabular-nums">{formatCount(row.attributedSignups)}</td>
              <td className="py-2 pr-3 tabular-nums text-white/70">{formatRate(row.signupConversion)}</td>
              <td className="py-2 pr-3 tabular-nums">{formatCount(row.premium)}</td>
              <td className="py-2 tabular-nums text-white/70">{formatRate(row.premiumConversion)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollTable>
  );
}

function GenerationTable({ rows }: { rows: GenerationRow[] }) {
  const any = rows.some(
    (row) => row.attributedUsers || row.creators || row.shares || row.premium,
  );
  if (!any) {
    return <p className="text-sm text-white/40">No generation observations in this period.</p>;
  }
    return (
    <ScrollTable>
      <table className="w-full min-w-[420px] text-left text-sm">
        <thead className="text-[10px] uppercase tracking-[0.14em] text-white/35">
          <tr>
            <th className="pb-2 pr-3 font-medium">Generation</th>
            <th className="pb-2 pr-3 font-medium">Users</th>
            <th className="pb-2 pr-3 font-medium">Creators</th>
            <th className="pb-2 pr-3 font-medium">Shares</th>
            <th className="pb-2 font-medium">Premium</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.bucket} className="border-t border-white/8">
              <td className="py-2 pr-3 text-white">{row.bucket}</td>
              <td className="py-2 pr-3 tabular-nums">{formatCount(row.attributedUsers)}</td>
              <td className="py-2 pr-3 tabular-nums">{formatCount(row.creators)}</td>
              <td className="py-2 pr-3 tabular-nums">{formatCount(row.shares)}</td>
              <td className="py-2 tabular-nums">{formatCount(row.premium)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollTable>
  );
}

export default function InternalAnalyticsDashboard({
  data,
}: {
  data: AnalyticsDashboard;
}) {
  const leakTo =
    data.biggestOpportunity.status === "ok" ? data.biggestOpportunity.toId : null;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050508] text-white">
      <div className="mx-auto min-w-0 max-w-[1440px] px-4 py-6 sm:px-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <a href="/studio" className="text-sm text-white/45 transition hover:text-white">
              ← Studio
            </a>
            <p className="mt-4 text-[10px] uppercase tracking-[0.28em] text-violet-300">
              Metaprom AI · internal
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Analytics</h1>
            <p className="mt-1 max-w-2xl text-sm text-white/45">
              Decision dashboard. First-party events only. No identities.
            </p>
          </div>
          <nav className="flex flex-wrap gap-2" aria-label="Period">
            {PERIODS.map((item) => (
              <a
                key={item.value}
                href={`/analytics?period=${item.value}`}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  data.period === item.value
                    ? "border-violet-300/50 bg-violet-400/15 text-white"
                    : "border-white/10 bg-white/5 text-white/50 hover:text-white"
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </header>

        <section className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
          <Kpi label="Visitors" value={formatCount(data.kpis.visitors)} />
          <Kpi
            label="Signups"
            value={formatCount(data.kpis.signups)}
            rate={data.kpis.signupFromVisit}
            rateLabel="from visit"
          />
          <Kpi
            label="Creators"
            value={formatCount(data.kpis.creators)}
            rate={data.kpis.creatorFromSignup}
            rateLabel="from signup"
          />
          <Kpi label="Shares created" value={formatCount(data.kpis.sharesCreated)} />
          <Kpi label="Share opens" value={formatCount(data.kpis.shareOpens)} />
          <Kpi
            label="Share CTA clicks"
            value={formatCount(data.kpis.shareCtaClicks)}
            rate={data.kpis.ctaFromOpen}
            rateLabel="CTR"
          />
          <Kpi
            label="Premium customers"
            value={formatCount(data.kpis.premiumCustomers)}
            rate={data.kpis.premiumFromSignup}
            rateLabel="from signup"
          />
          <Kpi label="Current K-factor" value={formatK(data.kpis.kFactor)} />
        </section>

        <div className="mt-4">
          <Opportunity opportunity={data.biggestOpportunity} />
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-xl border border-white/10 bg-black/35 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300/70">Primary funnel</p>
            <h2 className="mt-1 text-lg font-semibold">Conversion Funnel</h2>
            <p className="mt-1 text-xs text-white/40">
              Visitors → Signups → Creators → Shares → Premium
            </p>
            <div className="mt-4">
              <FunnelView steps={data.funnel} leakTo={leakTo} />
            </div>
          </section>

          <div className="grid gap-4">
            <section className="rounded-xl border border-white/10 bg-black/35 p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300/70">K-factor</p>
              <h2 className="mt-1 text-lg font-semibold">Viral coefficient</h2>
              <p className="mt-3 text-4xl font-semibold tabular-nums tracking-tight">
                {formatK(data.kFactor.k)}
              </p>
              <p className="mt-2 text-xs text-white/40">
                shares / creator × visits / share × signup / share visit
              </p>
              <div className="mt-3">
                <Metric label="Shares / Creator" value={formatRatio(data.kFactor.sharesPerCreator)} />
                <Metric label="Visits / Share" value={formatRatio(data.kFactor.visitsPerShare)} />
                <Metric label="Signup / Share Visit" value={formatRatio(data.kFactor.shareSignupRate, 2)} />
                <Metric label="K" value={formatK(data.kFactor.k)} />
              </div>
            </section>

            <section className="rounded-xl border border-white/10 bg-black/35 p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300/70">Viral generations</p>
              <h2 className="mt-1 text-lg font-semibold">A → B → C</h2>
              <div className="mt-3">
                <GenerationTable rows={data.generations} />
              </div>
            </section>
          </div>
        </div>

        <section className="mt-4 min-w-0 rounded-xl border border-white/10 bg-black/35 p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300/70">Acquisition</p>
          <h2 className="mt-1 text-lg font-semibold">Channels</h2>
          <div className="mt-3">
            <ChannelTable rows={data.channels} />
          </div>
        </section>

        <section className="mt-4 rounded-xl border border-white/10 bg-black/35 p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300/70">Share engine</p>
          <h2 className="mt-1 text-lg font-semibold">Do users distribute Metaprom?</h2>
          {!data.shareEngine.creatorOwnerMapComplete ? (
            <p className="mt-2 text-xs text-white/35">
              Creator owner map incomplete. Sharing-creator rates need a complete map into
              creation-completed creators.
            </p>
          ) : null}
          <div className="mt-3 grid gap-x-6 gap-y-0 sm:grid-cols-2 lg:grid-cols-3">
            <Metric
              label="Creators (creation completed)"
              value={formatCount(data.shareEngine.creators)}
            />
            <Metric
              label="Creators who shared"
              value={
                data.shareEngine.creatorsWhoShared === null
                  ? "INSUFFICIENT DATA"
                  : formatCount(data.shareEngine.creatorsWhoShared)
              }
            />
            <Metric label="Share rate" value={formatRate(data.shareEngine.shareRate)} />
            <Metric label="Shares created" value={formatCount(data.shareEngine.sharesCreated)} />
            <Metric
              label="Shares per sharing creator"
              value={formatRatio(data.shareEngine.sharesPerSharingCreator)}
            />
            <Metric label="Share opens" value={formatCount(data.shareEngine.shareOpens)} />
            <Metric
              label="Unique visitors from shares"
              value={
                data.shareEngine.uniqueVisitorsFromShares === null
                  ? "INSUFFICIENT DATA"
                  : formatCount(data.shareEngine.uniqueVisitorsFromShares)
              }
            />
            <Metric label="Visits per share" value={formatRatio(data.shareEngine.visitsPerShare)} />
            <Metric label="Share CTA clicks" value={formatCount(data.shareEngine.shareCtaClicks)} />
            <Metric label="Share CTA CTR" value={formatRate(data.shareEngine.shareCtaCtr)} />
            <Metric label="Attributed signups" value={formatCount(data.shareEngine.attributedSignups)} />
            <Metric label="Share → signup" value={formatRate(data.shareEngine.shareToSignup)} />
            <Metric
              label="Premium from share-acquired users"
              value={formatCount(data.shareEngine.premiumFromShare)}
            />
          </div>
        </section>

        <section className="mt-4 min-w-0 rounded-xl border border-white/10 bg-black/35 p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300/70">Share distribution</p>
          <h2 className="mt-1 text-lg font-semibold">Share channel performance</h2>
          <div className="mt-3">
            <ShareChannelTable rows={data.shareChannels} />
          </div>
        </section>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="grid gap-4">
            <section className="rounded-xl border border-white/10 bg-black/35 p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300/70">Premium</p>
              <h2 className="mt-1 text-lg font-semibold">Activations</h2>
              <p className="mt-1 text-xs text-white/40">
                Analytics / entitlement signal. Not payment accounting.
              </p>
              <div className="mt-3">
                <Metric
                  label="Premium activations"
                  value={formatCount(data.premium.activations)}
                />
                <Metric
                  label="Premium from direct / non-share"
                  value={formatCount(data.premium.fromNonShare)}
                />
                <Metric
                  label="Premium from share-acquired users"
                  value={formatCount(data.premium.fromShare)}
                />
                <Metric
                  label="Premium conversion rate"
                  value={formatRate(data.premium.conversionRate)}
                />
              </div>
            </section>

            <section className="rounded-xl border border-white/10 bg-black/35 p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300/70">Revenue</p>
              <h2 className="mt-1 text-lg font-semibold">Completed purchases</h2>
              <p className="mt-1 text-xs text-white/40">
                Authoritative Stripe completed purchases. Separate from Premium activations.
              </p>
              <div className="mt-3">
                <Metric
                  label="Revenue for selected period"
                  value={
                    data.premium.revenueAvailable && data.premium.revenueMxn !== null
                      ? formatMoneyMxn(data.premium.revenueMxn)
                      : "INSUFFICIENT DATA"
                  }
                />
              </div>
              <p className="mt-3 text-xs leading-5 text-white/35">
                Stripe purchases remain the money source of truth. Funnel events are not accounting.
              </p>
            </section>
          </div>

          <section className="rounded-xl border border-white/10 bg-black/35 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300/70">Activity</p>
            <h2 className="mt-1 text-lg font-semibold">Recent events</h2>
            {data.recent.length === 0 ? (
              <p className="mt-3 text-sm text-white/40">No events in this period.</p>
            ) : (
              <ol className="mt-3 space-y-1.5">
                {data.recent.map((item, index) => (
                  <li
                    key={`${item.at}-${item.eventType}-${index}`}
                    className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-sm"
                  >
                    <span className="w-[5.8rem] shrink-0 tabular-nums text-white/40">
                      {formatActivityTime(item.at)}
                    </span>
                    <span className="font-medium text-white/85">{item.eventType}</span>
                    {item.channel ? (
                      <span
                        className={
                          item.channel === UNATTRIBUTED_CHANNEL
                            ? "text-white/40"
                            : "capitalize text-white/40"
                        }
                      >
                        {channelLabel(item.channel)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <p className="mt-5 text-right text-[11px] text-white/25">
          Updated{" "}
          {new Intl.DateTimeFormat("en-GB", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "UTC",
          }).format(new Date(data.generatedAt))}{" "}
          UTC
        </p>
      </div>
    </main>
  );
}
