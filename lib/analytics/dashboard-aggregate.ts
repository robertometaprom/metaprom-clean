import { normalizeShareChannel } from "./channel";
import type {
  AnalyticsDashboard,
  AnalyticsPeriod,
  AttributionRow,
  BiggestOpportunity,
  ChannelRow,
  FunnelEventRow,
  FunnelStep,
  FunnelStepId,
  GenerationBucket,
  GenerationRow,
  GrowthEventRow,
  KFactorBreakdown,
  PurchaseRow,
  RecentActivityItem,
  ShareChannelRow,
  ShareOwnerRow,
} from "./dashboard-types";
import {
  ANALYTICS_PERIODS,
  FUNNEL_STEP_IDS,
  LOW_SAMPLE_THRESHOLD,
  UNATTRIBUTED_CHANNEL,
} from "./dashboard-types";
import { isUuid } from "./ids";

const RANGE_DAYS: Record<Exclude<AnalyticsPeriod, "all">, number> = {
  today: 0,
  "7d": 7,
  "30d": 30,
};

const FUNNEL_LABELS: Record<FunnelStepId, string> = {
  visitors: "Visitors",
  signups: "Signups",
  creation_started: "Creation Started",
  creation_completed: "Creation Completed",
  preview_viewed: "Preview Viewed",
  shares_created: "Shares Created",
  share_opens: "Share Opens",
  share_cta_clicks: "Share CTA Clicks",
  attributed_signups: "Attributed Signups",
  premium: "Premium",
};

const OPPORTUNITY_LABELS: Record<string, string> = {
  "visitors>signups": "VISIT → SIGNUP",
  "signups>creation_started": "SIGNUP → CREATION STARTED",
  "creation_started>creation_completed": "CREATION STARTED → CREATION COMPLETED",
  "creation_completed>preview_viewed": "CREATION COMPLETED → PREVIEW",
  "preview_viewed>shares_created": "PREVIEW → SHARE",
  "shares_created>share_opens": "SHARE → OPEN",
  "share_opens>share_cta_clicks": "SHARE OPEN → CTA",
  "share_cta_clicks>attributed_signups": "CTA → SIGNUP",
  "attributed_signups>premium": "ATTRIBUTED SIGNUP → PREMIUM",
};

const KNOWN_UTM_CHANNELS: Record<string, string> = {
  facebook: "facebook",
  fb: "facebook",
  instagram: "instagram",
  ig: "instagram",
  linkedin: "linkedin",
  whatsapp: "whatsapp",
  wa: "whatsapp",
  google: "google",
};

const SAFE_CHANNEL_RE = /^[a-z0-9][a-z0-9_-]{0,31}$/;

const RECENT_LIMIT = 24;
const RECENT_EVENT_TYPES = new Set([
  "landing_visit",
  "signup_completed",
  "creation_started",
  "creation_completed",
  "preview_viewed",
  "checkout_started",
  "purchase_completed",
  "premium_activated",
  "share_created",
  "share_opened",
  "share_cta_clicked",
]);

export function parseAnalyticsPeriod(value: unknown): AnalyticsPeriod {
  if (typeof value === "string" && (ANALYTICS_PERIODS as readonly string[]).includes(value)) {
    return value as AnalyticsPeriod;
  }
  return "7d";
}

export function analyticsRangeStart(
  period: AnalyticsPeriod,
  now = new Date(),
): string | null {
  if (period === "all") return null;
  const start = new Date(now);
  if (period === "today") {
    start.setUTCHours(0, 0, 0, 0);
  } else {
    start.setUTCDate(start.getUTCDate() - RANGE_DAYS[period]);
  }
  return start.toISOString();
}

export function isInAnalyticsRange(timestamp: string, start: string | null): boolean {
  return !start || timestamp >= start;
}

export function ratio(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return null;
  }
  return numerator / denominator;
}

export function dropOffFromConversion(conversion: number | null): number | null {
  if (conversion === null) return null;
  return Math.max(0, 1 - conversion);
}

/**
 * Display channel from already-collected first-touch fields.
 * Does not invent sources that were not stored.
 */
export function acquisitionChannelFromFields(input: {
  origin_kind?: unknown;
  share_channel?: unknown;
  utm_source?: unknown;
  referrer_host?: unknown;
  attributed_to_share?: unknown;
}): string {
  const shareChannel = normalizeShareChannel(input.share_channel);
  if (shareChannel) return shareChannel;

  const origin = typeof input.origin_kind === "string" ? input.origin_kind : null;
  const attributed = input.attributed_to_share === true;

  if (origin === "share" || attributed) return "share";

  const utm =
    typeof input.utm_source === "string" ? input.utm_source.trim().toLowerCase() : "";
  if (utm) {
    const mapped = KNOWN_UTM_CHANNELS[utm];
    if (mapped) return mapped;
    if (SAFE_CHANNEL_RE.test(utm)) return utm;
    if (origin === "utm") return "utm";
  }

  const referrer =
    typeof input.referrer_host === "string"
      ? input.referrer_host.trim().toLowerCase().replace(/^www\./, "")
      : "";
  const fromReferrer = mapKnownReferrer(referrer);
  if (fromReferrer) return fromReferrer;

  if (origin === "organic") return "organic";
  if (origin === "utm") return "utm";
  return "direct";
}

function mapKnownReferrer(host: string): string | null {
  if (!host) return null;
  if (
    host === "facebook.com" ||
    host.endsWith(".facebook.com") ||
    host === "fb.com" ||
    host === "m.facebook.com" ||
    host === "l.facebook.com"
  ) {
    return "facebook";
  }
  if (host === "instagram.com" || host.endsWith(".instagram.com")) return "instagram";
  if (host === "linkedin.com" || host.endsWith(".linkedin.com") || host === "lnkd.in") {
    return "linkedin";
  }
  if (host === "google.com" || host.endsWith(".google.com")) return "google";
  if (host === "whatsapp.com" || host.endsWith(".whatsapp.com") || host === "wa.me") {
    return "whatsapp";
  }
  return null;
}

function funnelChannel(event: FunnelEventRow): string {
  return acquisitionChannelFromFields(event.metadata);
}

function growthChannel(event: GrowthEventRow): string | null {
  return normalizeShareChannel(event.metadata.channel);
}

/** Known Share channel, or the unattributed bucket when none was stored. */
function shareEventChannel(event: GrowthEventRow): string {
  return growthChannel(event) ?? UNATTRIBUTED_CHANNEL;
}

function uniqueIds(ids: Array<string | null | undefined>): number {
  const set = new Set<string>();
  for (const id of ids) {
    if (id) set.add(id);
  }
  return set.size;
}

/**
 * Distinct known ids. If events exist but every identifier is missing,
 * unique count is unknown — not zero.
 */
export function uniqueOrUnknown(
  ids: Array<string | null | undefined>,
  eventCount: number,
): number | null {
  const n = uniqueIds(ids);
  if (eventCount > 0 && n === 0) return null;
  return n;
}

function isShareAttributed(event: FunnelEventRow): boolean {
  return (
    event.metadata.attributed_to_share === true ||
    event.metadata.origin_kind === "share" ||
    Boolean(event.share_slug)
  );
}

function creatorForShare(
  event: GrowthEventRow,
  owners: Map<string, string | null>,
): string | null {
  const fromMeta = event.metadata.creator_user_id;
  if (isUuid(fromMeta)) return fromMeta;
  if (event.share_slug && owners.has(event.share_slug)) {
    return owners.get(event.share_slug) ?? null;
  }
  return null;
}

function emptyChannel(): Omit<ChannelRow, "channel"> {
  return {
    visitors: 0,
    signups: 0,
    creators: 0,
    shares: 0,
    shareOpens: 0,
    ctaClicks: 0,
    premium: 0,
    visitToSignup: null,
    signupToPremium: null,
  };
}

function generationBucket(generation: number): GenerationBucket {
  if (generation <= 0) return "0";
  if (generation === 1) return "1";
  if (generation === 2) return "2";
  return "3+";
}

export function computeKFactor(input: {
  sharesCreated: number;
  creators: number;
  shareVisits: number | null;
  attributedSignups: number;
}): KFactorBreakdown {
  const sharesPerCreator = ratio(input.sharesCreated, input.creators);
  const visitsPerShare =
    input.shareVisits === null ? null : ratio(input.shareVisits, input.sharesCreated);
  const shareSignupRate =
    input.shareVisits === null ? null : ratio(input.attributedSignups, input.shareVisits);

  const k =
    sharesPerCreator !== null && visitsPerShare !== null && shareSignupRate !== null
      ? sharesPerCreator * visitsPerShare * shareSignupRate
      : null;

  return { sharesPerCreator, visitsPerShare, shareSignupRate, k };
}

export function pickBiggestOpportunity(funnel: FunnelStep[]): BiggestOpportunity {
  let best: Extract<BiggestOpportunity, { status: "ok" }> | null = null;

  for (let i = 1; i < funnel.length; i++) {
    const from = funnel[i - 1];
    const to = funnel[i];
    if (from.count <= 0 || to.conversionFromPrevious === null) continue;

    const candidate: Extract<BiggestOpportunity, { status: "ok" }> = {
      status: "ok",
      fromId: from.id,
      toId: to.id,
      label: OPPORTUNITY_LABELS[`${from.id}>${to.id}`] ?? `${from.label} → ${to.label}`,
      conversion: to.conversionFromPrevious,
      denominator: from.count,
      lowSample: from.count < LOW_SAMPLE_THRESHOLD,
    };

    if (!best || candidate.conversion < best.conversion) {
      best = candidate;
      continue;
    }

    if (candidate.conversion === best.conversion) {
      const bestFromId = best.fromId;
      const bestFromCount = funnel.find((step) => step.id === bestFromId)?.count ?? 0;
      if (from.count > bestFromCount) {
        best = candidate;
      }
    }
  }

  return best ?? { status: "insufficient" };
}

function paidRevenueMxn(purchases: PurchaseRow[] | null | undefined): {
  revenueMxn: number | null;
  revenueAvailable: boolean;
} {
  if (purchases == null) {
    return { revenueMxn: null, revenueAvailable: false };
  }

  let total = 0;
  for (const purchase of purchases) {
    if (purchase.provider !== "stripe" || purchase.status !== "completed") continue;
    if (purchase.currency !== "MXN") continue;
    if (!Number.isFinite(purchase.amount_mxn)) continue;
    total += purchase.amount_mxn;
  }

  return { revenueMxn: total, revenueAvailable: true };
}

export function aggregateAnalyticsDashboard(input: {
  period: AnalyticsPeriod;
  periodStart: string | null;
  now?: Date;
  funnelEvents: FunnelEventRow[];
  growthEvents: GrowthEventRow[];
  attributions: AttributionRow[];
  shareOwners: ShareOwnerRow[];
  purchases?: PurchaseRow[] | null;
}): AnalyticsDashboard {
  const start = input.periodStart;
  const funnelEvents = input.funnelEvents.filter((row) =>
    isInAnalyticsRange(row.created_at, start),
  );
  const growthEvents = input.growthEvents.filter((row) =>
    isInAnalyticsRange(row.created_at, start),
  );
  const purchases = input.purchases
    ? input.purchases.filter((row) =>
        isInAnalyticsRange(row.completed_at ?? row.created_at, start),
      )
    : input.purchases;

  const owners = new Map<string, string | null>();
  for (const owner of input.shareOwners) {
    owners.set(owner.share_slug, owner.creator_user_id);
  }

  const attributionByUser = new Map<string, AttributionRow>();
  for (const row of input.attributions) {
    attributionByUser.set(row.user_id, row);
  }

  const landing = funnelEvents.filter((row) => row.event_type === "landing_visit");
  const signups = funnelEvents.filter((row) => row.event_type === "signup_completed");
  const creationStarted = funnelEvents.filter((row) => row.event_type === "creation_started");
  const creationCompleted = funnelEvents.filter(
    (row) => row.event_type === "creation_completed",
  );
  const previewViewed = funnelEvents.filter((row) => row.event_type === "preview_viewed");
  const premiumEvents = funnelEvents.filter((row) => row.event_type === "premium_activated");
  const attributedSignups = signups.filter(isShareAttributed);

  const sharesCreated = growthEvents.filter((row) => row.event_type === "share_created");
  const shareOpens = growthEvents.filter((row) => row.event_type === "share_opened");
  const shareCtas = growthEvents.filter((row) => row.event_type === "share_cta_clicked");

  const visitors = uniqueOrUnknown(
    landing.map((row) => row.visitor_id),
    landing.length,
  );
  const visitorCount = visitors ?? 0;

  const signupCount = uniqueOrUnknown(
    signups.map((row) => row.user_id),
    signups.length,
  );
  const signupsKnown = signupCount ?? signups.length;

  const creators = uniqueOrUnknown(
    creationCompleted.map((row) => row.user_id),
    creationCompleted.length,
  );
  const creatorCount = creators ?? 0;

  const creationStartedUsers = uniqueOrUnknown(
    creationStarted.map((row) => row.user_id),
    creationStarted.length,
  );
  const creationStartedCount = creationStartedUsers ?? creationStarted.length;

  const previewUsers = uniqueOrUnknown(
    previewViewed.map((row) => row.user_id ?? row.visitor_id),
    previewViewed.length,
  );
  const previewCount = previewUsers ?? previewViewed.length;

  const premiumUsers = uniqueOrUnknown(
    premiumEvents.map((row) => row.user_id),
    premiumEvents.length,
  );
  const premiumCount = premiumUsers ?? premiumEvents.length;

  const attributedSignupCount = uniqueOrUnknown(
    attributedSignups.map((row) => row.user_id),
    attributedSignups.length,
  );
  const attributedSignupKnown = attributedSignupCount ?? attributedSignups.length;

  const uniqueShareVisitors = uniqueOrUnknown(
    shareOpens.map((row) => row.visitor_id),
    shareOpens.length,
  );

  const knownCreatorIds = new Set<string>();
  for (const event of creationCompleted) {
    if (event.user_id) knownCreatorIds.add(event.user_id);
  }

  const shareCreatorIds = sharesCreated.map((row) => creatorForShare(row, owners));
  const creatorOwnerMapComplete =
    sharesCreated.length === 0 ||
    shareCreatorIds.every((id): id is string => typeof id === "string" && knownCreatorIds.has(id));
  const creatorsWhoShared = creatorOwnerMapComplete ? uniqueIds(shareCreatorIds) : null;

  const kFactor = computeKFactor({
    sharesCreated: sharesCreated.length,
    creators: creatorCount,
    shareVisits: uniqueShareVisitors,
    attributedSignups: attributedSignupKnown,
  });

  const counts: Record<FunnelStepId, number> = {
    visitors: visitorCount,
    signups: signupsKnown,
    creation_started: creationStartedCount,
    creation_completed: creatorCount,
    preview_viewed: previewCount,
    shares_created: sharesCreated.length,
    share_opens: shareOpens.length,
    share_cta_clicks: shareCtas.length,
    attributed_signups: attributedSignupKnown,
    premium: premiumCount,
  };

  const funnel: FunnelStep[] = FUNNEL_STEP_IDS.map((id, index) => {
    const previous = index === 0 ? null : FUNNEL_STEP_IDS[index - 1];
    const conversionFromPrevious = previous ? ratio(counts[id], counts[previous]) : null;
    return {
      id,
      label: FUNNEL_LABELS[id],
      count: counts[id],
      conversionFromPrevious,
      dropOffFromPrevious: dropOffFromConversion(conversionFromPrevious),
    };
  });

  const biggestOpportunity = pickBiggestOpportunity(funnel);

  const channelMap = new Map<string, ChannelRow>();
  function channelRow(name: string): ChannelRow {
    const existing = channelMap.get(name);
    if (existing) return existing;
    const created: ChannelRow = { channel: name, ...emptyChannel() };
    channelMap.set(name, created);
    return created;
  }

  const landingVisitorsByChannel = new Map<string, Set<string>>();
  for (const event of landing) {
    const channel = funnelChannel(event);
    const row = channelRow(channel);
    if (event.visitor_id) {
      const set = landingVisitorsByChannel.get(channel) ?? new Set<string>();
      set.add(event.visitor_id);
      landingVisitorsByChannel.set(channel, set);
      row.visitors = set.size;
    }
  }

  const signupUsersByChannel = new Map<string, Set<string>>();
  for (const event of signups) {
    const channel = funnelChannel(event);
    const row = channelRow(channel);
    if (event.user_id) {
      const set = signupUsersByChannel.get(channel) ?? new Set<string>();
      set.add(event.user_id);
      signupUsersByChannel.set(channel, set);
      row.signups = set.size;
    } else {
      row.signups += 1;
    }
  }

  const creatorUsersByChannel = new Map<string, Set<string>>();
  for (const event of creationCompleted) {
    const channel = funnelChannel(event);
    const row = channelRow(channel);
    if (event.user_id) {
      const set = creatorUsersByChannel.get(channel) ?? new Set<string>();
      set.add(event.user_id);
      creatorUsersByChannel.set(channel, set);
      row.creators = set.size;
    }
  }

  const premiumUsersByChannel = new Map<string, Set<string>>();
  for (const event of premiumEvents) {
    const channel = funnelChannel(event);
    const row = channelRow(channel);
    if (event.user_id) {
      const set = premiumUsersByChannel.get(channel) ?? new Set<string>();
      set.add(event.user_id);
      premiumUsersByChannel.set(channel, set);
      row.premium = set.size;
    } else {
      row.premium += 1;
    }
  }

  for (const event of sharesCreated) {
    channelRow(shareEventChannel(event)).shares += 1;
  }
  for (const event of shareOpens) {
    channelRow(shareEventChannel(event)).shareOpens += 1;
  }
  for (const event of shareCtas) {
    channelRow(shareEventChannel(event)).ctaClicks += 1;
  }

  const channels = [...channelMap.values()]
    .map((row) => ({
      ...row,
      visitToSignup: ratio(row.signups, row.visitors),
      signupToPremium: ratio(row.premium, row.signups),
    }))
    .sort((a, b) => {
      if (b.visitors !== a.visitors) return b.visitors - a.visitors;
      if (b.signups !== a.signups) return b.signups - a.signups;
      if (b.shareOpens !== a.shareOpens) return b.shareOpens - a.shareOpens;
      return b.shares - a.shares || a.channel.localeCompare(b.channel);
    });

  const shareChannelNames = new Set<string>();
  for (const event of [...sharesCreated, ...shareOpens, ...shareCtas]) {
    shareChannelNames.add(shareEventChannel(event));
  }

  const shareChannels: ShareChannelRow[] = [...shareChannelNames]
    .map((channel) => {
      const shares = sharesCreated.filter((row) => shareEventChannel(row) === channel);
      const opens = shareOpens.filter((row) => shareEventChannel(row) === channel);
      const ctas = shareCtas.filter((row) => shareEventChannel(row) === channel);
      const attributed = attributedSignups.filter(
        (row) => normalizeShareChannel(row.metadata.share_channel) === channel,
      );
      const premiums = premiumEvents.filter(
        (row) =>
          isShareAttributed(row) &&
          normalizeShareChannel(row.metadata.share_channel) === channel,
      );
      const uniqueVisitors = uniqueOrUnknown(
        opens.map((row) => row.visitor_id),
        opens.length,
      );
      const attributedCount = uniqueOrUnknown(
        attributed.map((row) => row.user_id),
        attributed.length,
      );
      const attributedKnown = attributedCount ?? attributed.length;
      const premiumKnown =
        uniqueOrUnknown(
          premiums.map((row) => row.user_id),
          premiums.length,
        ) ?? premiums.length;

      return {
        channel,
        shares: shares.length,
        opens: opens.length,
        uniqueVisitors,
        opensPerShare: ratio(opens.length, shares.length),
        ctaClicks: ctas.length,
        ctaCtr: ratio(ctas.length, opens.length),
        attributedSignups: attributedKnown,
        signupConversion: uniqueVisitors === null ? null : ratio(attributedKnown, uniqueVisitors),
        premium: premiumKnown,
        premiumConversion: ratio(premiumKnown, attributedKnown),
      };
    })
    .sort((a, b) => b.opens - a.opens || b.shares - a.shares || a.channel.localeCompare(b.channel));

  const generationRows = new Map<GenerationBucket, GenerationRow>();
  for (const bucket of ["0", "1", "2", "3+"] as const) {
    generationRows.set(bucket, {
      bucket,
      attributedUsers: 0,
      creators: 0,
      shares: 0,
      premium: 0,
    });
  }

  for (const row of input.attributions) {
    if (!isInAnalyticsRange(row.attributed_at, start)) continue;
    generationRows.get(generationBucket(row.generation))!.attributedUsers += 1;
  }

  const creatorsByGen = new Map<GenerationBucket, Set<string>>();
  for (const event of creationCompleted) {
    if (!event.user_id) continue;
    const attr = attributionByUser.get(event.user_id);
    if (!attr) continue;
    const bucket = generationBucket(attr.generation);
    const set = creatorsByGen.get(bucket) ?? new Set<string>();
    set.add(event.user_id);
    creatorsByGen.set(bucket, set);
    generationRows.get(bucket)!.creators = set.size;
  }

  for (const event of sharesCreated) {
    const creatorId = creatorForShare(event, owners);
    if (!creatorId) continue;
    const attr = attributionByUser.get(creatorId);
    if (!attr) continue;
    generationRows.get(generationBucket(attr.generation))!.shares += 1;
  }

  const premiumByGen = new Map<GenerationBucket, Set<string>>();
  for (const event of premiumEvents) {
    if (!event.user_id) continue;
    const attr = attributionByUser.get(event.user_id);
    if (!attr) continue;
    const bucket = generationBucket(attr.generation);
    const set = premiumByGen.get(bucket) ?? new Set<string>();
    set.add(event.user_id);
    premiumByGen.set(bucket, set);
    generationRows.get(bucket)!.premium = set.size;
  }

  const premiumFromShare = premiumEvents.filter(isShareAttributed);
  const premiumFromShareCount =
    uniqueOrUnknown(
      premiumFromShare.map((row) => row.user_id),
      premiumFromShare.length,
    ) ?? premiumFromShare.length;
  const revenue = paidRevenueMxn(purchases);

  const recent: RecentActivityItem[] = [...funnelEvents, ...growthEvents]
    .filter((row) => RECENT_EVENT_TYPES.has(row.event_type))
    .sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0))
    .slice(0, RECENT_LIMIT)
    .map((row) => {
      const isShareEvent = row.event_type.startsWith("share_");
      const channel = isShareEvent
        ? shareEventChannel(row as GrowthEventRow)
        : funnelChannel(row as FunnelEventRow);
      return {
        at: row.created_at,
        eventType: row.event_type,
        channel,
      };
    });

  const shareToSignup =
    uniqueShareVisitors === null ? null : ratio(attributedSignupKnown, uniqueShareVisitors);

  return {
    period: input.period,
    periodStart: start,
    generatedAt: (input.now ?? new Date()).toISOString(),
    kpis: {
      visitors: visitorCount,
      signups: signupsKnown,
      creators: creatorCount,
      sharesCreated: sharesCreated.length,
      shareOpens: shareOpens.length,
      shareCtaClicks: shareCtas.length,
      premiumCustomers: premiumCount,
      kFactor: kFactor.k,
      signupFromVisit: ratio(signupsKnown, visitorCount),
      creatorFromSignup: ratio(creatorCount, signupsKnown),
      ctaFromOpen: ratio(shareCtas.length, shareOpens.length),
      premiumFromSignup: ratio(premiumCount, signupsKnown),
    },
    funnel,
    biggestOpportunity,
    channels,
    shareEngine: {
      creators: creatorCount,
      creatorsWhoShared,
      shareRate: creatorsWhoShared === null ? null : ratio(creatorsWhoShared, creatorCount),
      sharesCreated: sharesCreated.length,
      sharesPerSharingCreator:
        creatorsWhoShared === null ? null : ratio(sharesCreated.length, creatorsWhoShared),
      shareOpens: shareOpens.length,
      uniqueVisitorsFromShares: uniqueShareVisitors,
      visitsPerShare: kFactor.visitsPerShare,
      shareCtaClicks: shareCtas.length,
      shareCtaCtr: ratio(shareCtas.length, shareOpens.length),
      attributedSignups: attributedSignupKnown,
      shareToSignup,
      premiumFromShare: premiumFromShareCount,
      creatorOwnerMapComplete,
    },
    kFactor,
    generations: ["0", "1", "2", "3+"].map(
      (bucket) => generationRows.get(bucket as GenerationBucket)!,
    ),
    shareChannels,
    premium: {
      activations: premiumCount,
      fromNonShare: Math.max(0, premiumCount - premiumFromShareCount),
      fromShare: premiumFromShareCount,
      conversionRate: ratio(premiumCount, signupsKnown),
      revenueMxn: revenue.revenueMxn,
      revenueAvailable: revenue.revenueAvailable,
    },
    recent,
  };
}

const PII_KEY_RE =
  /(email|e-mail|name|full_name|display_name|phone|tel|mobile|whatsapp_number|prompt|customer_?intent|instruction|image|photo|video|card|pan|cvc|cvv|password|secret|token|visitor_id|user_id|parent_user|share_slug)/i;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

export function dashboardPayloadContainsPii(payload: unknown): boolean {
  const seen = new Set<unknown>();

  const walk = (value: unknown): boolean => {
    if (value == null) return false;
    if (typeof value === "string") {
      return EMAIL_RE.test(value) || /visitor_[a-z0-9-]+/i.test(value);
    }
    if (typeof value !== "object") return false;
    if (seen.has(value)) return false;
    seen.add(value);
    if (Array.isArray(value)) {
      return value.some(walk);
    }
    for (const [key, nested] of Object.entries(value)) {
      if (PII_KEY_RE.test(key)) return true;
      if (walk(nested)) return true;
    }
    return false;
  };

  return walk(payload) || EMAIL_RE.test(JSON.stringify(payload));
}
