/**
 * Client-facing internal analytics DTO.
 * Counts are observed quantities (0 means none).
 * `null` on a rate/K/unique metric means INSUFFICIENT DATA — never a fake 0.
 */

export const ANALYTICS_PERIODS = ["today", "7d", "30d", "all"] as const;

/**
 * Operational dashboard only. Rates whose denominator is below this count
 * stay visible and get a LOW SAMPLE qualifier. Not a statistical test.
 */
export const LOW_SAMPLE_THRESHOLD = 10;

/**
 * Display bucket for Share events whose channel was not stored.
 * Not a collected channel and must not be inferred from neighboring events.
 */
export const UNATTRIBUTED_CHANNEL = "unattributed";
export const UNATTRIBUTED_CHANNEL_LABEL = "Unknown / Unattributed";
export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[number];

export const FUNNEL_STEP_IDS = [
  "visitors",
  "signups",
  "creation_started",
  "creation_completed",
  "preview_viewed",
  "shares_created",
  "share_opens",
  "share_cta_clicks",
  "attributed_signups",
  "premium",
] as const;

export type FunnelStepId = (typeof FUNNEL_STEP_IDS)[number];

export type FunnelStep = {
  id: FunnelStepId;
  label: string;
  count: number;
  conversionFromPrevious: number | null;
  dropOffFromPrevious: number | null;
};

export type BiggestOpportunity =
  | {
      status: "ok";
      fromId: FunnelStepId;
      toId: FunnelStepId;
      label: string;
      conversion: number;
      denominator: number;
      lowSample: boolean;
    }
  | { status: "insufficient" };

export type ChannelRow = {
  channel: string;
  visitors: number;
  signups: number;
  creators: number;
  shares: number;
  shareOpens: number;
  ctaClicks: number;
  premium: number;
  visitToSignup: number | null;
  signupToPremium: number | null;
};

export type ShareEngineMetrics = {
  /** Distinct users with creation_completed in the period. */
  creators: number;
  /**
   * Distinct creators in that population who created a share.
   * `null` when the creator owner map cannot place every share in that population.
   */
  creatorsWhoShared: number | null;
  shareRate: number | null;
  sharesCreated: number;
  sharesPerSharingCreator: number | null;
  shareOpens: number;
  uniqueVisitorsFromShares: number | null;
  visitsPerShare: number | null;
  shareCtaClicks: number;
  shareCtaCtr: number | null;
  attributedSignups: number;
  shareToSignup: number | null;
  premiumFromShare: number;
  creatorOwnerMapComplete: boolean;
};

export type KFactorBreakdown = {
  sharesPerCreator: number | null;
  visitsPerShare: number | null;
  shareSignupRate: number | null;
  k: number | null;
};

export type GenerationBucket = "0" | "1" | "2" | "3+";

export type GenerationRow = {
  bucket: GenerationBucket;
  attributedUsers: number;
  creators: number;
  shares: number;
  premium: number;
};

export type ShareChannelRow = {
  channel: string;
  shares: number;
  opens: number;
  uniqueVisitors: number | null;
  opensPerShare: number | null;
  ctaClicks: number;
  ctaCtr: number | null;
  attributedSignups: number;
  signupConversion: number | null;
  premium: number;
  premiumConversion: number | null;
};

export type PremiumSignal = {
  activations: number;
  fromNonShare: number;
  fromShare: number;
  conversionRate: number | null;
  /** MXN from purchases table; omitted when the commerce read is unavailable. */
  revenueMxn: number | null;
  revenueAvailable: boolean;
};

export type RecentActivityItem = {
  at: string;
  eventType: string;
  channel: string | null;
};

export type KpiStrip = {
  visitors: number;
  signups: number;
  creators: number;
  sharesCreated: number;
  shareOpens: number;
  shareCtaClicks: number;
  premiumCustomers: number;
  kFactor: number | null;
  signupFromVisit: number | null;
  creatorFromSignup: number | null;
  ctaFromOpen: number | null;
  premiumFromSignup: number | null;
};

export type AnalyticsDashboard = {
  period: AnalyticsPeriod;
  periodStart: string | null;
  generatedAt: string;
  kpis: KpiStrip;
  funnel: FunnelStep[];
  biggestOpportunity: BiggestOpportunity;
  channels: ChannelRow[];
  shareEngine: ShareEngineMetrics;
  kFactor: KFactorBreakdown;
  generations: GenerationRow[];
  shareChannels: ShareChannelRow[];
  premium: PremiumSignal;
  recent: RecentActivityItem[];
};

export type FunnelEventRow = {
  event_type: string;
  visitor_id: string | null;
  user_id: string | null;
  share_slug: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type GrowthEventRow = {
  event_type: string;
  visitor_id: string | null;
  share_slug: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AttributionRow = {
  user_id: string;
  origin_kind: string;
  share_channel: string | null;
  referrer_host: string | null;
  utm_source: string | null;
  generation: number;
  attributed_at: string;
};

export type ShareOwnerRow = {
  share_slug: string;
  creator_user_id: string | null;
};

export type PurchaseRow = {
  amount_mxn: number;
  currency: string;
  status: string;
  provider: string;
  created_at: string;
  completed_at: string | null;
};
