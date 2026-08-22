import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  aggregateAnalyticsDashboard,
  analyticsRangeStart,
  parseAnalyticsPeriod,
} from "@/lib/analytics/dashboard-aggregate";
import type {
  AnalyticsDashboard,
  AttributionRow,
  FunnelEventRow,
  GrowthEventRow,
  PurchaseRow,
  ShareOwnerRow,
} from "@/lib/analytics/dashboard-types";

const PAGE_SIZE = 1000;
const MAX_ROWS = 50_000;

const FUNNEL_COLUMNS =
  "event_type,visitor_id,user_id,share_slug,metadata,created_at";
const GROWTH_COLUMNS = "event_type,visitor_id,share_slug,metadata,created_at";
const ATTRIBUTION_COLUMNS =
  "user_id,origin_kind,share_channel,referrer_host,utm_source,generation,attributed_at";
const PURCHASE_COLUMNS =
  "amount_mxn,currency,status,provider,created_at,completed_at";

type PageResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

type FilterQuery = {
  select(columns: string): FilterQuery;
  order(column: string, options?: { ascending: boolean }): FilterQuery;
  gte(column: string, value: string): FilterQuery;
  in(column: string, values: readonly string[]): FilterQuery;
  range(from: number, to: number): PromiseLike<PageResult<Record<string, unknown>>>;
};

export type AnalyticsReadStore = {
  from(table: string): FilterQuery;
};

async function paginate<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  label: string,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) {
      throw new Error(`Analytics ${label} read failed: ${error.message}`);
    }
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) {
      return rows;
    }
  }
  throw new Error(`Analytics ${label} read exceeded the bounded row cap`);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function mapFunnelRows(rows: Record<string, unknown>[]): FunnelEventRow[] {
  return rows.map((row) => ({
    event_type: String(row.event_type ?? ""),
    visitor_id: asNullableString(row.visitor_id),
    user_id: asNullableString(row.user_id),
    share_slug: asNullableString(row.share_slug),
    metadata: asRecord(row.metadata),
    created_at: String(row.created_at ?? ""),
  }));
}

function mapGrowthRows(rows: Record<string, unknown>[]): GrowthEventRow[] {
  return rows.map((row) => ({
    event_type: String(row.event_type ?? ""),
    visitor_id: asNullableString(row.visitor_id),
    share_slug: asNullableString(row.share_slug),
    metadata: asRecord(row.metadata),
    created_at: String(row.created_at ?? ""),
  }));
}

function mapAttributionRows(rows: Record<string, unknown>[]): AttributionRow[] {
  return rows.map((row) => ({
    user_id: String(row.user_id ?? ""),
    origin_kind: String(row.origin_kind ?? "direct"),
    share_channel: asNullableString(row.share_channel),
    referrer_host: asNullableString(row.referrer_host),
    utm_source: asNullableString(row.utm_source),
    generation: typeof row.generation === "number" ? row.generation : 0,
    attributed_at: String(row.attributed_at ?? ""),
  }));
}

function mapPurchaseRows(rows: Record<string, unknown>[]): PurchaseRow[] {
  return rows.map((row) => ({
    amount_mxn: typeof row.amount_mxn === "number" ? row.amount_mxn : 0,
    currency: String(row.currency ?? ""),
    status: String(row.status ?? ""),
    provider: String(row.provider ?? ""),
    created_at: String(row.created_at ?? ""),
    completed_at: asNullableString(row.completed_at),
  }));
}

function boundedQuery(
  store: AnalyticsReadStore,
  table: string,
  columns: string,
  start: string | null,
): FilterQuery {
  const query = store.from(table).select(columns).order("created_at", {
    ascending: false,
  });
  return start ? query.gte("created_at", start) : query;
}

async function loadShareOwners(
  store: AnalyticsReadStore,
  slugs: string[],
): Promise<ShareOwnerRow[]> {
  const unique = [...new Set(slugs.filter(Boolean))];
  if (unique.length === 0) return [];

  const assets: Array<{ share_slug: string; project_id: string }> = [];
  for (let i = 0; i < unique.length; i += PAGE_SIZE) {
    const chunk = unique.slice(i, i + PAGE_SIZE);
    const { data, error } = await store
      .from("assets")
      .select("share_slug,project_id")
      .in("share_slug", chunk)
      .range(0, PAGE_SIZE - 1);
    if (error) {
      throw new Error(`Analytics share-owner read failed: ${error.message}`);
    }
    for (const row of data ?? []) {
      const share_slug = asNullableString(row.share_slug);
      const project_id =
        typeof row.project_id === "string" || typeof row.project_id === "number"
          ? String(row.project_id)
          : null;
      if (share_slug && project_id) {
        assets.push({ share_slug, project_id });
      }
    }
  }

  const projectIds = [...new Set(assets.map((asset) => asset.project_id))];
  const userByProject = new Map<string, string | null>();
  for (let i = 0; i < projectIds.length; i += PAGE_SIZE) {
    const chunk = projectIds.slice(i, i + PAGE_SIZE);
    const { data, error } = await store
      .from("projects")
      .select("id,user_id")
      .in("id", chunk)
      .range(0, PAGE_SIZE - 1);
    if (error) {
      throw new Error(`Analytics project-owner read failed: ${error.message}`);
    }
    for (const row of data ?? []) {
      userByProject.set(String(row.id), asNullableString(row.user_id));
    }
  }

  return assets.map((asset) => ({
    share_slug: asset.share_slug,
    creator_user_id: userByProject.get(asset.project_id) ?? null,
  }));
}

export async function getAnalyticsDashboard(
  periodInput: unknown,
  store?: AnalyticsReadStore,
): Promise<AnalyticsDashboard> {
  const period = parseAnalyticsPeriod(periodInput);
  const periodStart = analyticsRangeStart(period);
  const client = store ?? (createAdminClient() as unknown as AnalyticsReadStore);

  const [funnelRows, growthRows, attributionRows] = await Promise.all([
    paginate(
      (from, to) => boundedQuery(client, "funnel_events", FUNNEL_COLUMNS, periodStart).range(from, to),
      "funnel_events",
    ),
    paginate(
      (from, to) => boundedQuery(client, "growth_events", GROWTH_COLUMNS, periodStart).range(from, to),
      "growth_events",
    ),
    paginate(
      (from, to) =>
        client
          .from("user_attributions")
          .select(ATTRIBUTION_COLUMNS)
          .order("attributed_at", { ascending: false })
          .range(from, to),
      "user_attributions",
    ),
  ]);

  let purchases: PurchaseRow[] | null = null;
  try {
    const purchaseRows = await paginate(
      (from, to) => boundedQuery(client, "purchases", PURCHASE_COLUMNS, periodStart).range(from, to),
      "purchases",
    );
    purchases = mapPurchaseRows(purchaseRows);
  } catch {
    purchases = null;
  }

  const growth = mapGrowthRows(growthRows);
  const shareOwners = await loadShareOwners(
    client,
    growth.map((row) => row.share_slug ?? ""),
  );

  return aggregateAnalyticsDashboard({
    period,
    periodStart,
    funnelEvents: mapFunnelRows(funnelRows),
    growthEvents: growth,
    attributions: mapAttributionRows(attributionRows),
    shareOwners,
    purchases,
  });
}
