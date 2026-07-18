import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildLibraryObjectPath,
  LIBRARY_BUCKET,
} from "@/lib/library-storage";

const DEFAULT_SIGNED_URL_TTL_SECONDS = 60 * 60;
const PUBLIC_STREAM_SIGNED_URL_TTL_SECONDS = 60 * 5;

export async function uploadLibraryObjectServer(input: {
  userId: string;
  projectId: string;
  assetId: string;
  kind: "original" | "enhanced" | "teaser" | "premium";
  buffer: Buffer;
  contentType: string;
  extension: string;
}): Promise<{ path: string }> {
  const supabase = await createClient();
  const path = buildLibraryObjectPath(input);

  const { error } = await supabase.storage
    .from(LIBRARY_BUCKET)
    .upload(path, input.buffer, {
      upsert: true,
      contentType: input.contentType,
    });

  if (error) {
    throw error;
  }

  return { path };
}

export async function updateAssetPremiumVideoServer(input: {
  assetId: string;
  userId: string;
  projectId: string;
  videoBuffer: Buffer;
}): Promise<void> {
  const supabase = await createClient();

  const { path } = await uploadLibraryObjectServer({
    userId: input.userId,
    projectId: input.projectId,
    assetId: input.assetId,
    kind: "premium",
    buffer: input.videoBuffer,
    contentType: "video/mp4",
    extension: "mp4",
  });

  const { error } = await supabase
    .from("assets")
    .update({
      premium_video_path: path,
      payment_status: "paid",
    })
    .eq("id", input.assetId);

  if (error) {
    throw error;
  }
}

export async function createSignedLibraryUrlServer(
  path: string,
  ttlSeconds = DEFAULT_SIGNED_URL_TTL_SECONDS,
): Promise<string> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.storage
    .from(LIBRARY_BUCKET)
    .createSignedUrl(path, ttlSeconds);

  if (error || !data?.signedUrl) {
    throw error ?? new Error("Failed to create signed library URL.");
  }

  return data.signedUrl;
}

export const PUBLIC_PREVIEW_STREAM_TTL_SECONDS =
  PUBLIC_STREAM_SIGNED_URL_TTL_SECONDS;
