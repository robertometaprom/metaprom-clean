import { createClient } from "@/lib/supabase/server";
import {
  buildLibraryObjectPath,
  LIBRARY_BUCKET,
} from "@/lib/library-storage";

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
