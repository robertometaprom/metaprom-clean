import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createSignedLibraryUrlServer, PUBLIC_PREVIEW_STREAM_TTL_SECONDS } from "@/lib/library-storage-server";
import { buildPublicPreviewMetadata } from "@/lib/preview/public-preview-metadata";
import { buildPublicPreviewStreamPath } from "@/lib/preview/share-url";
import { isValidShareSlug } from "@/lib/preview/share-slug";
import {
  isPubliclyAccessiblePreview,
  type PreviewVisibility,
  type PublicPreview,
  type PublicPreviewKind,
  type PublicPreviewPageResult,
  type ResolvedPublicCommercial,
} from "@/lib/preview/types";

const RESOLVED_COMMERCIAL_SELECT =
  "share_slug, teaser_video_path, image_path, original_path, ai_instructions, industry, visibility, created_at, updated_at";

const PUBLIC_PREVIEW_SIGNED_URL_TTL_SECONDS = 60 * 15;

type ResolvedCommercialRow = {
  share_slug: string;
  teaser_video_path: string | null;
  image_path: string | null;
  original_path: string | null;
  ai_instructions: string | null;
  industry: string | null;
  visibility: PreviewVisibility;
  created_at: string;
  updated_at: string;
};

function resolvePreviewKind(row: ResolvedCommercialRow): PublicPreviewKind | null {
  if (row.teaser_video_path) {
    return "commercial";
  }

  if (row.image_path) {
    return "advertising_image";
  }

  return null;
}

function mapResolvedCommercialRow(
  row: ResolvedCommercialRow,
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
    originalPhotoPath: row.original_path,
    customerIntent: row.ai_instructions,
    industry: row.industry,
    visibility: row.visibility,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function createSignedPreviewAssetUrl(
  path: string | null,
): Promise<string | null> {
  if (!path) {
    return null;
  }

  try {
    return await createSignedLibraryUrlServer(
      path,
      PUBLIC_PREVIEW_SIGNED_URL_TTL_SECONDS,
    );
  } catch (error) {
    console.error("createSignedPreviewAssetUrl failed", { path, error });
    return null;
  }
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

/**
 * Look up a preview asset by its immutable public slug.
 * Supports Commercial (teaser) and Advertising Image (enhanced image only).
 */
export async function getPreviewBySlug(
  slug: string,
): Promise<ResolvedPublicCommercial | null> {
  if (!isValidShareSlug(slug)) {
    return null;
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("assets")
    .select(RESOLVED_COMMERCIAL_SELECT)
    .eq("share_slug", slug)
    .maybeSingle();

  if (error) {
    console.error("getPreviewBySlug error", { slug, error });
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapResolvedCommercialRow(data as ResolvedCommercialRow);
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
    customerIntent: resolved.customerIntent,
    locale: options?.locale,
    kind: resolved.kind,
  });

  const isAdvertisingImage = resolved.kind === "advertising_image";

  const [posterUrl, originalPhotoUrl] = await Promise.all([
    createSignedPreviewAssetUrl(resolved.posterImagePath),
    // Advertising Image public share must never expose the protected source photo.
    isAdvertisingImage
      ? Promise.resolve(null)
      : createSignedPreviewAssetUrl(resolved.originalPhotoPath),
  ]);

  return {
    shareSlug: resolved.shareSlug,
    kind: resolved.kind,
    publicUrl: metadata.publicUrl,
    title: metadata.title,
    description: metadata.description,
    posterUrl,
    originalPhotoUrl,
    streamPath: isAdvertisingImage
      ? null
      : buildPublicPreviewStreamPath(resolved.shareSlug),
    industry: resolved.industry,
    visibility: resolved.visibility,
    createdAt: resolved.createdAt,
    updatedAt: resolved.updatedAt,
  };
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

  return createSignedLibraryUrlServer(
    resolved.teaserVideoPath,
    PUBLIC_PREVIEW_STREAM_TTL_SECONDS,
  );
}
