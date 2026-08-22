import "server-only";

import { isValidShareSlug } from "@/lib/preview/share-slug";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AcquisitionState } from "@/lib/analytics/attribution";
import { normalizeShareChannel } from "@/lib/analytics/channel";
import type {
  FunnelEventInsert,
  UserAttributionInsert,
} from "@/lib/analytics/events";
import { isUuid, isVisitorId } from "@/lib/analytics/ids";
import { sanitizeFunnelMetadata } from "@/lib/analytics/sanitize";

const UNIQUE_VIOLATION = "23505";

function tryAdminClient(): FunnelStore | null {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return null;
  }

  try {
    return createAdminClient() as unknown as FunnelStore;
  } catch {
    return null;
  }
}

export type FunnelStore = {
  from(table: string): {
    select(columns: string): {
      eq(
        column: string,
        value: string,
      ): {
        maybeSingle(): PromiseLike<{
          data: Record<string, unknown> | null;
          error: { message: string; code?: string } | null;
        }>;
      };
    };
    insert(
      row: Record<string, unknown>,
    ): PromiseLike<{ error: { message: string; code?: string } | null }>;
  };
};

export type ShareOwner = {
  assetId: string;
  creatorUserId: string | null;
};

function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === UNIQUE_VIOLATION;
}

export async function lookupShareOwner(
  shareSlug: string,
  store?: FunnelStore,
): Promise<ShareOwner | null> {
  if (!isValidShareSlug(shareSlug)) {
    return null;
  }

  try {
    const client = store ?? tryAdminClient();
    if (!client) {
      return null;
    }
    const { data: asset, error: assetError } = await client
      .from("assets")
      .select("id, project_id")
      .eq("share_slug", shareSlug)
      .maybeSingle();

    if (assetError || !asset) {
      return null;
    }

    const projectId =
      typeof asset.project_id === "string" || typeof asset.project_id === "number"
        ? String(asset.project_id)
        : null;
    const assetId =
      typeof asset.id === "string" || typeof asset.id === "number"
        ? String(asset.id)
        : "";

    if (!projectId || !assetId) {
      return { assetId, creatorUserId: null };
    }

    const { data: project, error: projectError } = await client
      .from("projects")
      .select("user_id")
      .eq("id", projectId)
      .maybeSingle();

    if (projectError) {
      return { assetId, creatorUserId: null };
    }

    const creatorUserId =
      typeof project?.user_id === "string" && isUuid(project.user_id)
        ? project.user_id
        : null;

    return { assetId, creatorUserId };
  } catch (error) {
    console.error("analytics share owner lookup failed:", error);
    return null;
  }
}

export async function insertFunnelEvent(
  row: FunnelEventInsert,
  store?: FunnelStore,
): Promise<"inserted" | "duplicate" | "failed"> {
  try {
    const client = store ?? tryAdminClient();
    if (!client) {
      return "failed";
    }
    const { error } = await client.from("funnel_events").insert({
      event_type: row.event_type,
      visitor_id: row.visitor_id && isVisitorId(row.visitor_id) ? row.visitor_id : null,
      user_id: row.user_id && isUuid(row.user_id) ? row.user_id : null,
      share_slug:
        row.share_slug && isValidShareSlug(row.share_slug) ? row.share_slug : null,
      idempotency_key: row.idempotency_key,
      metadata: sanitizeFunnelMetadata(row.metadata),
    });

    if (isUniqueViolation(error)) {
      return "duplicate";
    }

    if (error) {
      console.error("funnel_events insert failed:", error.message);
      return "failed";
    }

    return "inserted";
  } catch (error) {
    console.error("funnel_events persist failed:", error);
    return "failed";
  }
}

export async function insertUserAttribution(
  row: UserAttributionInsert,
  store?: FunnelStore,
): Promise<"inserted" | "duplicate" | "failed"> {
  try {
    const client = store ?? tryAdminClient();
    if (!client) {
      return "failed";
    }
    const { error } = await client.from("user_attributions").insert({
      user_id: row.user_id,
      visitor_id: row.visitor_id && isVisitorId(row.visitor_id) ? row.visitor_id : null,
      origin_kind: row.origin_kind,
      share_slug:
        row.share_slug && isValidShareSlug(row.share_slug) ? row.share_slug : null,
      share_channel: normalizeShareChannel(row.share_channel),
      referrer_host: row.referrer_host,
      utm_source: row.utm_source,
      utm_medium: row.utm_medium,
      utm_campaign: row.utm_campaign,
      generation: Number.isFinite(row.generation) ? Math.max(0, Math.floor(row.generation)) : 0,
      parent_user_id:
        row.parent_user_id && isUuid(row.parent_user_id) ? row.parent_user_id : null,
    });

    if (isUniqueViolation(error)) {
      return "duplicate";
    }

    if (error) {
      console.error("user_attributions insert failed:", error.message);
      return "failed";
    }

    return "inserted";
  } catch (error) {
    console.error("user_attributions persist failed:", error);
    return "failed";
  }
}

export async function getUserAttribution(
  userId: string,
  store?: FunnelStore,
): Promise<UserAttributionInsert | null> {
  if (!isUuid(userId)) {
    return null;
  }

  try {
    const client = store ?? tryAdminClient();
    if (!client) {
      return null;
    }
    const { data, error } = await client
      .from("user_attributions")
      .select(
        "user_id, visitor_id, origin_kind, share_slug, share_channel, referrer_host, utm_source, utm_medium, utm_campaign, generation, parent_user_id",
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      user_id: String(data.user_id),
      visitor_id:
        typeof data.visitor_id === "string" ? data.visitor_id : null,
      origin_kind:
        data.origin_kind === "share" ||
        data.origin_kind === "utm" ||
        data.origin_kind === "organic" ||
        data.origin_kind === "direct"
          ? data.origin_kind
          : "direct",
      share_slug: typeof data.share_slug === "string" ? data.share_slug : null,
      share_channel:
        typeof data.share_channel === "string" ? data.share_channel : null,
      referrer_host:
        typeof data.referrer_host === "string" ? data.referrer_host : null,
      utm_source: typeof data.utm_source === "string" ? data.utm_source : null,
      utm_medium: typeof data.utm_medium === "string" ? data.utm_medium : null,
      utm_campaign:
        typeof data.utm_campaign === "string" ? data.utm_campaign : null,
      generation:
        typeof data.generation === "number" ? data.generation : 0,
      parent_user_id:
        typeof data.parent_user_id === "string" ? data.parent_user_id : null,
    };
  } catch (error) {
    console.error("user_attributions lookup failed:", error);
    return null;
  }
}

export async function attributionMetadataForUser(
  userId: string | null | undefined,
  store?: FunnelStore,
): Promise<Record<string, unknown>> {
  if (!userId) {
    return {};
  }

  const attr = await getUserAttribution(userId, store);
  if (!attr) {
    return {};
  }

  return {
    origin_kind: attr.origin_kind,
    ...(attr.share_slug ? { share_slug: attr.share_slug } : {}),
    ...(attr.share_channel ? { share_channel: attr.share_channel } : {}),
    generation: attr.generation,
    ...(attr.parent_user_id ? { parent_user_id: attr.parent_user_id } : {}),
    ...(attr.utm_source ? { utm_source: attr.utm_source } : {}),
    ...(attr.utm_medium ? { utm_medium: attr.utm_medium } : {}),
    ...(attr.utm_campaign ? { utm_campaign: attr.utm_campaign } : {}),
    attributed_to_share: Boolean(attr.share_slug),
  };
}

export async function resolveShareGeneration(input: {
  acquisition: AcquisitionState | null;
  store?: FunnelStore;
}): Promise<{
  generation: number;
  parentUserId: string | null;
  shareSlug: string | null;
  shareChannel: string | null;
}> {
  const share = input.acquisition?.share ?? null;
  if (!share) {
    return {
      generation: 0,
      parentUserId: null,
      shareSlug: null,
      shareChannel: null,
    };
  }

  const owner = await lookupShareOwner(share.shareSlug, input.store);
  const parentUserId = owner?.creatorUserId ?? null;
  let generation = 1;

  if (parentUserId) {
    const parent = await getUserAttribution(parentUserId, input.store);
    generation = (parent?.generation ?? 0) + 1;
  }

  return {
    generation,
    parentUserId,
    shareSlug: share.shareSlug,
    shareChannel: share.shareChannel,
  };
}
