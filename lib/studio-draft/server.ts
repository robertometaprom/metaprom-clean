import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { type StudioProjectMetadata } from "@/lib/biblioteca";
import { inferExtensionFromMime } from "@/lib/library-storage";
import { persistStudioCreationServer } from "@/lib/studio-persistence-server";
import type { Mode } from "@/lib/prompts";
import {
  buildStudioDraftObjectPath,
  createResumeToken,
  STUDIO_DRAFTS_BUCKET,
  type StudioDraftAssetUrls,
  type StudioDraftPayload,
  type StudioDraftRecord,
  type StudioDraftResponse,
} from "@/lib/studio-draft/types";
import {
  assertValidResumeToken,
  isValidResumeToken,
  sanitizeConversationHistory,
} from "@/lib/security/validation";

const DRAFT_SIGNED_URL_TTL_SECONDS = 60 * 60;

function extensionFromContentType(contentType: string): string {
  return inferExtensionFromMime(contentType || "application/octet-stream");
}

async function uploadDraftObject(input: {
  resumeToken: string;
  kind: "original" | "enhanced" | "teaser";
  buffer: Buffer;
  contentType: string;
}): Promise<string> {
  const admin = createAdminClient();
  const path = buildStudioDraftObjectPath(
    input.resumeToken,
    input.kind,
    extensionFromContentType(input.contentType),
  );

  const { error } = await admin.storage
    .from(STUDIO_DRAFTS_BUCKET)
    .upload(path, input.buffer, {
      upsert: true,
      contentType: input.contentType,
    });

  if (error) {
    throw error;
  }

  return path;
}

async function createSignedDraftUrl(path: string | null): Promise<string | null> {
  if (!path) return null;

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(STUDIO_DRAFTS_BUCKET)
    .createSignedUrl(path, DRAFT_SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    throw error ?? new Error("Failed to create signed draft URL.");
  }

  return data.signedUrl;
}

async function downloadDraftObject(path: string): Promise<Buffer> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(STUDIO_DRAFTS_BUCKET)
    .download(path);

  if (error || !data) {
    throw error ?? new Error("Failed to download draft object.");
  }

  return Buffer.from(await data.arrayBuffer());
}

async function deleteDraftObjects(paths: Array<string | null | undefined>) {
  const admin = createAdminClient();
  const filtered = paths.filter((path): path is string => Boolean(path));

  if (filtered.length === 0) return;

  const { error } = await admin.storage.from(STUDIO_DRAFTS_BUCKET).remove(filtered);
  if (error) {
    console.error("Failed to delete draft storage objects", error);
  }
}

async function revertDraftClaim(
  resumeToken: string,
  userId: string,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("studio_drafts")
    .update({
      claimed_by: null,
      claimed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("resume_token", resumeToken)
    .eq("claimed_by", userId);

  if (error) {
    console.error("Failed to revert draft claim after persist failure", error);
  }
}

export async function saveStudioDraftServer(input: {
  payload: StudioDraftPayload;
  originalFile?: File | null;
  enhancedBuffer?: Buffer | null;
  enhancedContentType?: string;
  teaserBuffer?: Buffer | null;
}): Promise<{ resumeToken: string }> {
  const admin = createAdminClient();
  const resumeToken = input.payload.resumeToken?.trim()
    ? assertValidResumeToken(input.payload.resumeToken, "resumeToken")
    : createResumeToken();
  const now = new Date().toISOString();
  const conversationHistory = sanitizeConversationHistory(
    input.payload.conversationHistory ?? [],
  ) ?? [];

  const existing = input.payload.resumeToken
    ? await getStudioDraftRow(resumeToken)
    : null;

  if (existing?.claimed_at) {
    throw new Error("Este borrador ya fue vinculado a una cuenta.");
  }

  if (
    existing &&
    new Date(existing.expires_at).getTime() < Date.now()
  ) {
    throw new Error("Este borrador expiró. Intenta guardarlo de nuevo.");
  }

  let originalPath = existing?.original_path ?? null;
  let originalName = existing?.original_name ?? null;
  let originalContentType = existing?.original_content_type ?? null;
  let enhancedPath = existing?.enhanced_path ?? null;
  let teaserPath = existing?.teaser_path ?? null;

  if (input.originalFile) {
    const buffer = Buffer.from(await input.originalFile.arrayBuffer());
    originalContentType = input.originalFile.type || "image/jpeg";
    originalName = input.originalFile.name || "upload.jpg";
    originalPath = await uploadDraftObject({
      resumeToken,
      kind: "original",
      buffer,
      contentType: originalContentType,
    });
  }

  if (input.enhancedBuffer) {
    const contentType = input.enhancedContentType || "image/png";
    enhancedPath = await uploadDraftObject({
      resumeToken,
      kind: "enhanced",
      buffer: input.enhancedBuffer,
      contentType,
    });
  }

  if (input.teaserBuffer) {
    teaserPath = await uploadDraftObject({
      resumeToken,
      kind: "teaser",
      buffer: input.teaserBuffer,
      contentType: "video/mp4",
    });
  }

  const row = {
    resume_token: resumeToken,
    phase: input.payload.phase,
    customer_intent: input.payload.customerIntent || null,
    image_prompt: input.payload.imagePrompt || null,
    video_prompt: input.payload.videoPrompt || null,
    workflow_id: input.payload.workflowId ?? null,
    industry: input.payload.industry ?? null,
    intended_destination: input.payload.intendedDestination ?? null,
    destination: input.payload.destination ?? null,
    product_mode: input.payload.productMode,
    original_path: originalPath,
    original_name: originalName,
    original_content_type: originalContentType,
    enhanced_path: enhancedPath,
    teaser_path: teaserPath,
    conversation_history: conversationHistory,
    pending_action: input.payload.pendingAction ?? null,
    updated_at: now,
  };

  if (existing) {
    const { error } = await admin
      .from("studio_drafts")
      .update(row)
      .eq("resume_token", resumeToken);

    if (error) throw error;
  } else {
    const { error } = await admin.from("studio_drafts").insert(row);
    if (error) throw error;
  }

  return { resumeToken };
}

async function getStudioDraftRow(
  resumeToken: string,
): Promise<StudioDraftRecord | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("studio_drafts")
    .select("*")
    .eq("resume_token", resumeToken)
    .maybeSingle();

  if (error) throw error;
  return (data as StudioDraftRecord | null) ?? null;
}

export async function getStudioDraftServer(
  resumeToken: string,
): Promise<StudioDraftResponse | null> {
  if (!isValidResumeToken(resumeToken)) {
    return null;
  }

  const draft = await getStudioDraftRow(resumeToken);
  if (!draft) return null;

  if (draft.claimed_at) {
    return null;
  }

  if (new Date(draft.expires_at).getTime() < Date.now()) {
    return null;
  }

  const urls: StudioDraftAssetUrls = {
    originalUrl: await createSignedDraftUrl(draft.original_path),
    enhancedUrl: await createSignedDraftUrl(draft.enhanced_path),
    teaserUrl: await createSignedDraftUrl(draft.teaser_path),
  };

  return { draft, urls };
}

export type ClaimStudioDraftResult = {
  projectId: string;
  assetId: string;
  shareSlug: string | null;
  pendingAction: StudioDraftRecord["pending_action"];
  phase: StudioDraftRecord["phase"];
  /** False for standalone Advertising Image drafts (no teaser video). */
  hadTeaser: boolean;
};

export async function claimStudioDraftServer(
  resumeToken: string,
  userId: string,
): Promise<ClaimStudioDraftResult> {
  const validatedToken = assertValidResumeToken(resumeToken, "token");
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: claimedDraft, error: claimError } = await admin
    .from("studio_drafts")
    .update({
      claimed_by: userId,
      claimed_at: now,
      updated_at: now,
    })
    .eq("resume_token", validatedToken)
    .is("claimed_at", null)
    .gt("expires_at", now)
    .select("*")
    .maybeSingle();

  if (claimError) {
    throw claimError;
  }

  if (!claimedDraft) {
    const draft = await getStudioDraftRow(validatedToken);

    if (!draft) {
      throw new Error("No encontramos tu borrador. Intenta recuperarlo de nuevo.");
    }

    if (draft.claimed_at) {
      throw new Error("Este borrador ya fue vinculado a una cuenta.");
    }

    if (new Date(draft.expires_at).getTime() < Date.now()) {
      throw new Error("Este borrador expiró. Tu trabajo local sigue disponible para reintentar.");
    }

    throw new Error("No pudimos vincular tu borrador. Intenta de nuevo.");
  }

  const draft = claimedDraft as StudioDraftRecord;

  if (!draft.original_path || !draft.enhanced_path) {
    await revertDraftClaim(validatedToken, userId);
    throw new Error("El borrador está incompleto. Intenta guardarlo de nuevo.");
  }

  try {
    const originalBuffer = await downloadDraftObject(draft.original_path);
    const enhancedBuffer = await downloadDraftObject(draft.enhanced_path);
    const teaserBuffer = draft.teaser_path
      ? await downloadDraftObject(draft.teaser_path)
      : null;

    const originalFile = new File(
      [Uint8Array.from(originalBuffer)],
      draft.original_name || "original.jpg",
      {
        type: draft.original_content_type || "image/jpeg",
      },
    );

    const enhancedContentType =
      extensionFromContentType(draft.enhanced_path) === "jpg"
        ? "image/jpeg"
        : "image/png";
    const enhancedDataUrl = `data:${enhancedContentType};base64,${enhancedBuffer.toString("base64")}`;

    const projectMetadata: StudioProjectMetadata = {
      workflow_id: draft.workflow_id,
      industry: draft.industry,
      intended_destination: draft.intended_destination,
      destination: draft.destination,
    };

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || user.id !== userId) {
      await revertDraftClaim(validatedToken, userId);
      throw new Error("Authentication required.");
    }

    const teaserVideoBlob = teaserBuffer
      ? new Blob([Uint8Array.from(teaserBuffer)], { type: "video/mp4" })
      : undefined;

    const result = await persistStudioCreationServer({
      userId,
      originalFile,
      enhancedDataUrl,
      teaserVideoBlob,
      imagePrompt: draft.image_prompt || "",
      videoPrompt: draft.video_prompt || "",
      customerIntent: draft.customer_intent || "",
      mode: (draft.product_mode || "custom") as Mode,
      projectMetadata,
      // Commercial unchanged (never bills advertising). Advertising Image credit
      // is consumed at successful generation persist, not at claim/Finalizar.
      billAdvertisingAsset: false,
    });

    await deleteDraftObjects([
      draft.original_path,
      draft.enhanced_path,
      draft.teaser_path,
    ]);

    return {
      projectId: result.projectId,
      assetId: result.assetId,
      shareSlug: result.asset.share_slug ?? null,
      pendingAction: draft.pending_action,
      phase: draft.phase,
      hadTeaser: Boolean(teaserVideoBlob),
    };
  } catch (error) {
    await revertDraftClaim(validatedToken, userId);
    throw error;
  }
}
