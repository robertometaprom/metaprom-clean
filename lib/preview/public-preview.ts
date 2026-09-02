import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  createSignedLibraryUrlServer,
  PUBLIC_PREVIEW_STREAM_TTL_SECONDS,
} from "@/lib/library-storage-server";
import { buildPublicPreviewMetadata } from "@/lib/preview/public-preview-metadata";
import { sanitizePublicPreview } from "@/lib/preview/sanitize-public-preview";
import { isValidShareSlug } from "@/lib/preview/share-slug";
import {
  isPubliclyAccessiblePreview,
  type PreviewVisibility,
  type PublicPreview,
  type PublicPreviewKind,
  type PublicPreviewPageResult,
  type ResolvedPublicCommercial,
} from "@/lib/preview/types";
import { createSignedStudioDraftUrlServer } from "@/lib/studio-draft/server";

const RESOLVED_ASSET_SELECT =
  "share_slug, teaser_video_path, image_path, ai_instructions, industry, visibility, created_at, updated_at";

const RESOLVED_DRAFT_SELECT =
  "share_slug, teaser_path, enhanced_path, customer_intent, industry, created_at, updated_at";

type ResolvedAssetRow = {
  share_slug: string;
  teaser_video_path: string | null;
  image_path: string | null;
  ai_instructions: string | null;
  industry: string | null;
  visibility: PreviewVisibility;
  created_at: string;
  updated_at: string;
};

type ResolvedDraftRow = {
  share_slug: string;
  teaser_path: string;
  enhanced_path: string | null;
  customer_intent: string | null;
  industry: string | null;
  created_at: string;
  updated_at: string;
};

function resolvePreviewKind(row: ResolvedAssetRow): PublicPreviewKind | null {
  if (row.teaser_video_path) {
    return "commercial";
  }

  if (row.image_path) {
    return "advertising_image";
  }

  return null;
}

function mapResolvedAssetRow(
  row: ResolvedAssetRow,
): ResolvedPublicCommercial | null {
  const kind = resolvePreviewKind(row);
  if (!kind) {
    return null;
  }

  return {
    shareSlug: row.share_slug,
    kind,
    teaserVideoPath: row.teaser_video_path,
    posterImagePath: row.image_path,
    originalPhotoPath: null,
    customerIntent: row.ai_instructions,
    industry: row.industry,
    visibility: row.visibility,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    storageSource: "library",
  };
}

function mapResolvedDraftRow(
  row: ResolvedDraftRow,
): ResolvedPublicCommercial | null {
  if (!row.teaser_path) {
    return null;
  }

  return {
    shareSlug: row.share_slug,
    kind: "commercial",
    teaserVideoPath: row.teaser_path,
    posterImagePath: row.enhanced_path,
    originalPhotoPath: null,
    customerIntent: row.customer_intent,
    industry: row.industry,
    visibility: "public",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    storageSource: "studio_drafts",
  };
}

async function createSignedPreviewUrl(
  resolved: ResolvedPublicCommercial,
  path: string,
): Promise<string> {
  if (resolved.storageSource === "studio_drafts") {
    return createSignedStudioDraftUrlServer(path, PUBLIC_PREVIEW_STREAM_TTL_SECONDS);
  }

  return createSignedLibraryUrlServer(path, PUBLIC_PREVIEW_STREAM_TTL_SECONDS);
}

/**
 * Resolve a preview commercial by slug for server-side use (streaming, SSR).
 * Public landing pages must use this instead of direct database access.
 */
export async function resolvePublicCommercial(
  slug: string,
): Promise<ResolvedPublicCommercial | null> {
  return getPreviewBySlug(slug);
}

async function getPreviewAssetBySlug(
  slug: string,
): Promise<ResolvedPublicCommercial | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("assets")
    .select(RESOLVED_ASSET_SELECT)
    .eq("share_slug", slug)
    .maybeSingle();

  if (error) {
    console.error("getPreviewAssetBySlug error", { slug, error });
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapResolvedAssetRow(data as ResolvedAssetRow);
}

async function getPreviewDraftBySlug(
  slug: string,
): Promise<ResolvedPublicCommercial | null> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("studio_drafts")
    .select(RESOLVED_DRAFT_SELECT)
    .eq("share_slug", slug)
    .is("claimed_at", null)
    .gt("expires_at", now)
    .not("teaser_path", "is", null)
    .maybeSingle();

  if (error) {
    console.error("getPreviewDraftBySlug error", { slug, error });
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapResolvedDraftRow(data as ResolvedDraftRow);
}

/**
 * Look up a preview asset by its immutable public slug.
 * Supports Commercial (teaser) and Advertising Image (enhanced image only).
 * Falls back to unclaimed anonymous studio drafts with teaser media.
 * Never selects Premium HD, original photos, owner identity, or resume tokens.
 */
export async function getPreviewBySlug(
  slug: string,
): Promise<ResolvedPublicCommercial | null> {
  if (!isValidShareSlug(slug)) {
    return null;
  }

  const asset = await getPreviewAssetBySlug(slug);
  if (asset) {
    return asset;
  }

  return getPreviewDraftBySlug(slug);
}

/**
 * Return sanitized public preview data safe for unauthenticated clients.
 */
export async function getPublicPreview(
  slug: string,
  options?: { locale?: "es" | "en" },
): Promise<PublicPreview | null> {
  const resolved = await getPreviewBySlug(slug);

  if (!resolved || !isPubliclyAccessiblePreview(resolved.visibility)) {
    return null;
  }

  const metadata = buildPublicPreviewMetadata({
    shareSlug: resolved.shareSlug,
    locale: options?.locale,
    kind: resolved.kind,
  });

  return sanitizePublicPreview({
    shareSlug: resolved.shareSlug,
    kind: resolved.kind,
    publicUrl: metadata.publicUrl,
    title: metadata.title,
    description: metadata.description,
    hasPoster: Boolean(resolved.posterImagePath),
    industry: resolved.industry,
    visibility: resolved.visibility,
    createdAt: resolved.createdAt,
    updatedAt: resolved.updatedAt,
  });
}

/**
 * Resolve the public landing page state for `/p/[share_slug]`.
 * Keeps slug validation, availability, and preview assembly in the backend layer.
 */
export async function resolvePublicPreviewPage(
  slug: string,
  options?: { locale?: "es" | "en" },
): Promise<PublicPreviewPageResult> {
  if (!isValidShareSlug(slug)) {
    return { kind: "invalid_slug" };
  }

  const resolved = await getPreviewBySlug(slug);

  if (!resolved) {
    return { kind: "not_found" };
  }

  if (!isPubliclyAccessiblePreview(resolved.visibility)) {
    return { kind: "unavailable" };
  }

  const preview = await getPublicPreview(slug, options);

  if (!preview) {
    return { kind: "unavailable" };
  }

  return { kind: "preview", preview };
}

/**
 * Create a short-lived signed URL for controlled teaser streaming.
 * Advertising Image previews have no teaser stream.
 * Never signs Premium HD.
 */
export async function createPublicPreviewStreamUrl(
  slug: string,
): Promise<string | null> {
  const resolved = await resolvePublicCommercial(slug);

  if (
    !resolved ||
    !resolved.teaserVideoPath ||
    !isPubliclyAccessiblePreview(resolved.visibility)
  ) {
    return null;
  }

  return createSignedPreviewUrl(resolved, resolved.teaserVideoPath);
}

/**
 * Create a short-lived signed URL for the public advertising/poster image.
 * Never signs the original private customer photo.
 */
export async function createPublicPreviewImageUrl(
  slug: string,
): Promise<string | null> {
  const resolved = await resolvePublicCommercial(slug);

  if (
    !resolved ||
    !resolved.posterImagePath ||
    !isPubliclyAccessiblePreview(resolved.visibility)
  ) {
    return null;
  }

  return createSignedPreviewUrl(resolved, resolved.posterImagePath);
}
