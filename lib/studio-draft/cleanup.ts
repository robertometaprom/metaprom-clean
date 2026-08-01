import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { STUDIO_DRAFTS_BUCKET } from "@/lib/studio-draft/types";

export type DraftCleanupResult = {
  expiredRowsDeleted: number;
  orphanedStorageObjectsDeleted: number;
  errors: string[];
};

/**
 * Deletes expired, unclaimed studio draft rows and their storage objects.
 * Intended for scheduled invocation (e.g. daily cron) — not wired to a route yet.
 */
export async function cleanupExpiredStudioDrafts(input?: {
  batchSize?: number;
  now?: Date;
}): Promise<DraftCleanupResult> {
  const admin = createAdminClient();
  const batchSize = input?.batchSize ?? 100;
  const now = (input?.now ?? new Date()).toISOString();
  const errors: string[] = [];
  let expiredRowsDeleted = 0;
  let orphanedStorageObjectsDeleted = 0;

  const { data: expiredDrafts, error: selectError } = await admin
    .from("studio_drafts")
    .select("id, resume_token, original_path, enhanced_path, teaser_path")
    .is("claimed_at", null)
    .lt("expires_at", now)
    .limit(batchSize);

  if (selectError) {
    throw selectError;
  }

  for (const draft of expiredDrafts ?? []) {
    const paths = [draft.original_path, draft.enhanced_path, draft.teaser_path].filter(
      (path): path is string => Boolean(path),
    );

    if (paths.length > 0) {
      const { error: storageError } = await admin.storage
        .from(STUDIO_DRAFTS_BUCKET)
        .remove(paths);

      if (storageError) {
        errors.push(
          `Failed to delete storage for draft ${draft.resume_token}: ${storageError.message}`,
        );
        continue;
      }

      orphanedStorageObjectsDeleted += paths.length;
    }

    const { error: deleteError } = await admin
      .from("studio_drafts")
      .delete()
      .eq("id", draft.id)
      .is("claimed_at", null);

    if (deleteError) {
      errors.push(
        `Failed to delete draft row ${draft.resume_token}: ${deleteError.message}`,
      );
      continue;
    }

    expiredRowsDeleted += 1;
  }

  return {
    expiredRowsDeleted,
    orphanedStorageObjectsDeleted,
    errors,
  };
}

/**
 * Removes storage objects under studio-drafts that have no matching DB row.
 * Run less frequently than expired draft cleanup; list operations are paginated.
 */
export async function cleanupOrphanedDraftStorage(input?: {
  pageSize?: number;
}): Promise<{ orphanedStorageObjectsDeleted: number; errors: string[] }> {
  const admin = createAdminClient();
  const pageSize = input?.pageSize ?? 200;
  const errors: string[] = [];
  let orphanedStorageObjectsDeleted = 0;
  let offset = 0;

  while (true) {
    const { data: objects, error: listError } = await admin.storage
      .from(STUDIO_DRAFTS_BUCKET)
      .list("", {
        limit: pageSize,
        offset,
        sortBy: { column: "name", order: "asc" },
      });

    if (listError) {
      throw listError;
    }

    if (!objects || objects.length === 0) {
      break;
    }

    for (const object of objects) {
      if (!object.name || object.id === null) continue;

      const resumeToken = object.name.split("/")[0];
      if (!resumeToken) continue;

      const { data: draft, error: draftError } = await admin
        .from("studio_drafts")
        .select("id")
        .eq("resume_token", resumeToken)
        .maybeSingle();

      if (draftError) {
        errors.push(
          `Failed to look up draft ${resumeToken}: ${draftError.message}`,
        );
        continue;
      }

      if (draft) continue;

      const prefix = `${resumeToken}/`;
      const { data: tokenObjects, error: tokenListError } = await admin.storage
        .from(STUDIO_DRAFTS_BUCKET)
        .list(resumeToken, { limit: 20 });

      if (tokenListError) {
        errors.push(
          `Failed to list orphaned prefix ${resumeToken}: ${tokenListError.message}`,
        );
        continue;
      }

      const paths = (tokenObjects ?? []).map((entry) => `${prefix}${entry.name}`);

      if (paths.length === 0) continue;

      const { error: removeError } = await admin.storage
        .from(STUDIO_DRAFTS_BUCKET)
        .remove(paths);

      if (removeError) {
        errors.push(
          `Failed to delete orphaned storage for ${resumeToken}: ${removeError.message}`,
        );
        continue;
      }

      orphanedStorageObjectsDeleted += paths.length;
    }

    if (objects.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return { orphanedStorageObjectsDeleted, errors };
}
