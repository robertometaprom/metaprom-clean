import "server-only";

import {
  buildAutoProjectName,
  type StudioProjectMetadata,
} from "@/lib/biblioteca";
import {
  dataUrlToBlob,
  inferExtensionFromMime,
} from "@/lib/library-storage";
import {
  uploadLibraryObjectServer,
} from "@/lib/library-storage-server";
import { generateShareSlug, isShareSlugUniqueViolation } from "@/lib/preview/share-slug";
import { createClient } from "@/lib/supabase/server";
import type { Mode } from "@/lib/prompts";
import type { PersistStudioCreationResult } from "@/lib/studio-persistence";

function isSchemaColumnMissingError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const { code, message } = error as { code?: string; message?: string };
  return (
    code === "42703" ||
    code === "PGRST204" ||
    (typeof message === "string" &&
      (message.includes("does not exist") ||
        (message.includes("Could not find the") &&
          message.includes("column"))))
  );
}

export async function persistStudioCreationServer(input: {
  userId: string;
  originalFile: File;
  enhancedDataUrl: string;
  teaserVideoBlob?: Blob;
  imagePrompt: string;
  videoPrompt: string;
  customerIntent: string;
  mode: Mode;
  projectMetadata: StudioProjectMetadata;
}): Promise<PersistStudioCreationResult> {
  const supabase = await createClient();

  const projectInsert = {
    name: buildAutoProjectName(input.customerIntent),
    user_id: input.userId,
    workflow_id: input.projectMetadata.workflow_id ?? null,
    industry: input.projectMetadata.industry ?? null,
    intended_destination: input.projectMetadata.intended_destination ?? null,
    destination: input.projectMetadata.destination ?? null,
  };

  let projectResult = await supabase
    .from("projects")
    .insert(projectInsert)
    .select("id")
    .single();

  if (projectResult.error && isSchemaColumnMissingError(projectResult.error)) {
    const { destination: _destination, ...fallbackInsert } = projectInsert;
    projectResult = await supabase
      .from("projects")
      .insert(fallbackInsert)
      .select("id")
      .single();
  }

  if (projectResult.error || !projectResult.data) {
    throw projectResult.error ?? new Error("Failed to create project.");
  }

  const projectId = projectResult.data.id as string;

  const assetInsert = {
    project_id: projectId,
    original_name: input.originalFile.name,
    image_url: input.enhancedDataUrl,
    mode: input.mode,
    ai_instructions: input.customerIntent || null,
    image_prompt: input.imagePrompt,
    video_prompt: input.videoPrompt,
    workflow_id: input.projectMetadata.workflow_id ?? null,
    industry: input.projectMetadata.industry ?? null,
    payment_status: "none",
  };

  const assetResult = await supabase
    .from("assets")
    .insert(assetInsert)
    .select("id, share_slug")
    .single();

  if (assetResult.error || !assetResult.data) {
    throw assetResult.error ?? new Error("Failed to create asset.");
  }

  const assetId = assetResult.data.id as string;
  const originalExtension =
    inferExtensionFromMime(input.originalFile.type || "image/jpeg") || "jpg";
  const originalBuffer = Buffer.from(await input.originalFile.arrayBuffer());

  const originalUpload = await uploadLibraryObjectServer({
    userId: input.userId,
    projectId,
    assetId,
    kind: "original",
    buffer: originalBuffer,
    contentType: input.originalFile.type || "image/jpeg",
    extension: originalExtension,
  });

  const enhancedBlob = dataUrlToBlob(input.enhancedDataUrl);
  const enhancedBuffer = Buffer.from(await enhancedBlob.arrayBuffer());
  const enhancedUpload = await uploadLibraryObjectServer({
    userId: input.userId,
    projectId,
    assetId,
    kind: "enhanced",
    buffer: enhancedBuffer,
    contentType: enhancedBlob.type || "image/png",
    extension: inferExtensionFromMime(enhancedBlob.type || "image/png"),
  });

  let assetUpdates: Record<string, unknown> = {
    original_path: originalUpload.path,
    image_path: enhancedUpload.path,
    image_url: input.enhancedDataUrl,
    image_prompt: input.imagePrompt,
    video_prompt: input.videoPrompt,
    ai_instructions: input.customerIntent || null,
  };

  if (input.teaserVideoBlob) {
    const teaserBuffer = Buffer.from(await input.teaserVideoBlob.arrayBuffer());
    const teaserUpload = await uploadLibraryObjectServer({
      userId: input.userId,
      projectId,
      assetId,
      kind: "teaser",
      buffer: teaserBuffer,
      contentType: "video/mp4",
      extension: "mp4",
    });

    let shareSlug = generateShareSlug();
    for (let attempt = 0; attempt < 12; attempt += 1) {
      assetUpdates = {
        ...assetUpdates,
        teaser_video_path: teaserUpload.path,
        share_slug: shareSlug,
        visibility: "public",
      };

      const updateResult = await supabase
        .from("assets")
        .update(assetUpdates)
        .eq("id", assetId)
        .select("id, share_slug, visibility, payment_status")
        .single();

      if (!updateResult.error) {
        return {
          projectId,
          assetId,
          asset: updateResult.data as PersistStudioCreationResult["asset"],
        };
      }

      if (
        !isShareSlugUniqueViolation(updateResult.error) &&
        !isSchemaColumnMissingError(updateResult.error)
      ) {
        throw updateResult.error;
      }

      if (isSchemaColumnMissingError(updateResult.error)) {
        const { share_slug: _shareSlug, visibility: _visibility, ...rest } =
          assetUpdates;
        const fallbackUpdate = await supabase
          .from("assets")
          .update(rest)
          .eq("id", assetId)
          .select("id, payment_status")
          .single();

        if (fallbackUpdate.error || !fallbackUpdate.data) {
          throw fallbackUpdate.error ?? new Error("Failed to update asset.");
        }

        return {
          projectId,
          assetId,
          asset: fallbackUpdate.data as PersistStudioCreationResult["asset"],
        };
      }

      shareSlug = generateShareSlug();
    }

    throw new Error("Unable to assign a unique share slug.");
  }

  const updateResult = await supabase
    .from("assets")
    .update(assetUpdates)
    .eq("id", assetId)
    .select("id, share_slug, visibility, payment_status")
    .single();

  if (updateResult.error || !updateResult.data) {
    throw updateResult.error ?? new Error("Failed to update asset.");
  }

  return {
    projectId,
    assetId,
    asset: updateResult.data as PersistStudioCreationResult["asset"],
  };
}
