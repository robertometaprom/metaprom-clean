import "server-only";

import { lookupShareOwner } from "@/lib/analytics/persist";
import { isVisitorId } from "@/lib/analytics/ids";
import { createAdminClient } from "@/lib/supabase/admin";
import type { GrowthEventInsert } from "@/lib/growth/schema";
import { isPersistedShareEventType } from "@/lib/growth/share-events";
import { isValidShareSlug } from "@/lib/preview/share-slug";

export type ShareEventsStore = {
  from(table: string): {
    select(columns: string): {
      eq(
        column: string,
        value: string,
      ): {
        maybeSingle(): PromiseLike<{
          data: { share_slug?: string } | null;
          error: { message: string } | null;
        }>;
      };
    };
    insert(
      row: GrowthEventInsert,
    ): PromiseLike<{ error: { message: string } | null }>;
  };
};

/**
 * Insert Share P1 events with the existing service-role path.
 * Unknown slugs and disallowed types are ignored. Insert failure is logged only.
 */
export async function persistShareGrowthEvent(
  row: GrowthEventInsert,
  store?: ShareEventsStore,
): Promise<boolean> {
  if (!isValidShareSlug(row.share_slug)) {
    return false;
  }

  if (!isPersistedShareEventType(row.event_type)) {
    return false;
  }

  try {
    const client = store ?? (createAdminClient() as unknown as ShareEventsStore);
    const { data, error: lookupError } = await client
      .from("assets")
      .select("share_slug")
      .eq("share_slug", row.share_slug)
      .maybeSingle();

    if (lookupError) {
      console.error("growth_events slug lookup failed:", lookupError.message);
      return false;
    }

    if (!data) {
      return false;
    }

    const metadata: Record<string, unknown> = { ...(row.metadata ?? {}) };
    if (!store && row.event_type === "share_created") {
      const owner = await lookupShareOwner(row.share_slug);
      if (owner?.assetId) {
        metadata.asset_id = owner.assetId;
      }
      if (owner?.creatorUserId) {
        metadata.creator_user_id = owner.creatorUserId;
      }
    }

    const { error } = await client.from("growth_events").insert({
      share_slug: row.share_slug,
      event_type: row.event_type,
      metadata,
      visitor_id:
        row.visitor_id && isVisitorId(row.visitor_id) ? row.visitor_id : null,
    });

    if (error) {
      console.error("growth_events insert failed:", error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error("growth_events persist failed:", error);
    return false;
  }
}
