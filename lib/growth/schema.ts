import type { GrowthEventType } from "@/lib/growth/events";

/**
 * Database row shape for `public.growth_events` (PR1b schema, PR6 collection).
 */
export type GrowthEventRecord = {
  id: string;
  share_slug: string;
  event_type: GrowthEventType;
  metadata: Record<string, unknown>;
  visitor_id: string | null;
  created_at: string;
};

export type GrowthEventInsert = {
  share_slug: string;
  event_type: GrowthEventType;
  metadata?: Record<string, unknown>;
  visitor_id?: string | null;
};

/**
 * Future aggregate metrics keyed by share_slug (PR6+).
 */
export type GrowthMetricsSnapshot = {
  shareSlug: string;
  views: number;
  uniqueViews: number;
  shares: number;
  whatsappShares: number;
  copyLink: number;
  ctaClicks: number;
  registrations: number;
  premiumConversions: number;
};
