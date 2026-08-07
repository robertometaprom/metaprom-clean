import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Undo a first-persist that must not become a deliverable (e.g. insufficient
 * Advertising Image balance after a concurrent race). Clears finished media
 * markers by deleting the new asset row; optionally deletes an empty new project.
 */
export async function revokeUndeliveredAdvertisingPersist(
  supabase: SupabaseClient,
  input: {
    assetId: string | number;
    projectId?: string | null;
    /** When true, also delete the project created for this first persist. */
    deleteProject?: boolean;
  },
): Promise<void> {
  const assetId = input.assetId;
  const { error: assetError } = await supabase
    .from("assets")
    .delete()
    .eq("id", assetId);

  if (assetError) {
    console.error(
      "[entitlements] Failed to revoke undelivered advertising persist asset:",
      assetError,
    );
  }

  if (input.deleteProject && input.projectId) {
    const { error: projectError } = await supabase
      .from("projects")
      .delete()
      .eq("id", input.projectId);

    if (projectError) {
      console.error(
        "[entitlements] Failed to revoke undelivered advertising persist project:",
        projectError,
      );
    }
  }
}
