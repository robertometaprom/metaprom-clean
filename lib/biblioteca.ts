import { createClient } from "@/lib/supabase/client";
import {
  resolveLibraryStoragePath,
  resolveLibraryUrl,
} from "@/lib/library-storage";
import { buildPublicPreviewUrl } from "@/lib/preview/share-url";
import type { PreviewVisibility } from "@/lib/preview/types";
import type { User } from "@supabase/supabase-js";
import type { Mode } from "./prompts";
import type { AssetPaymentStatus } from "./commercial/tiers";
import type { StudioDestination } from "./studio-destination";

export class BibliotecaAuthError extends Error {
  constructor(message = "Authentication required to access Biblioteca.") {
    super(message);
    this.name = "BibliotecaAuthError";
  }
}

export type BibliotecaProject = {
  id: string;
  name: string;
  user_id?: string | null;
  description?: string | null;
  workflow_id?: string | null;
  industry?: string | null;
  intended_destination?: string | null;
  destination?: StudioDestination | null;
  created_at?: string | null;
};

export type BibliotecaAsset = {
  id: string;
  project_id: string;
  original_name?: string | null;
  original_url?: string | null;
  original_path?: string | null;
  image_url: string;
  image_path?: string | null;
  video_url?: string | null;
  teaser_video_url?: string | null;
  teaser_video_path?: string | null;
  premium_video_url?: string | null;
  premium_video_path?: string | null;
  share_slug?: string | null;
  visibility?: PreviewVisibility;
  image_prompt?: string | null;
  video_prompt?: string | null;
  mode: Mode;
  ai_instructions?: string | null;
  workflow_id?: string | null;
  industry?: string | null;
  payment_status?: AssetPaymentStatus;
  created_at?: string | null;
  updated_at?: string | null;
};

export type StudioProjectMetadata = {
  workflow_id?: string | null;
  industry?: string | null;
  intended_destination?: string | null;
  destination?: StudioDestination | null;
};

export type PersistStudioAssetInput = {
  mode: Mode;
};

const PROJECT_SELECT =
  "id, name, user_id, workflow_id, industry, intended_destination, created_at";
const ASSET_SELECT_CORE =
  "id, project_id, original_name, original_url, original_path, image_url, image_path, video_url, teaser_video_url, teaser_video_path, premium_video_url, premium_video_path, image_prompt, video_prompt, mode, ai_instructions, workflow_id, industry, payment_status, created_at";
const ASSET_SHARE_FIELDS = "share_slug, visibility, updated_at";
const ASSET_SELECT = `${ASSET_SELECT_CORE}, ${ASSET_SHARE_FIELDS}`;

function isMissingSchemaColumnError(
  error: { code?: string; message?: string } | null | undefined,
): boolean {
  if (!error) return false;

  if (error.code === "42703" || error.code === "PGRST204") {
    return true;
  }

  return (
    typeof error.message === "string" &&
    (error.message.includes("does not exist") ||
      (error.message.includes("Could not find the") &&
        error.message.includes("column")))
  );
}

function withoutShareFields(
  updates: Partial<BibliotecaAsset>,
): Partial<BibliotecaAsset> {
  const { share_slug: _shareSlug, visibility: _visibility, ...rest } = updates;
  return rest;
}

type ProjectInsertPayload = {
  name: string;
  user_id: string;
  description: string | null;
  workflow_id: string | null;
  industry: string | null;
  intended_destination: string | null;
  destination: StudioDestination | null;
};

function withoutProjectDestinationField(
  payload: ProjectInsertPayload,
): Omit<ProjectInsertPayload, "destination"> {
  const { destination: _destination, ...rest } = payload;
  return rest;
}

function logBibliotecaSupabaseError(
  context: string,
  payload: unknown,
  error: { code?: string; message?: string; details?: string; hint?: string },
): void {
  console.error(context, {
    insertPayload: payload,
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  });
}

type BibliotecaSupabaseClient = ReturnType<typeof createClient>;

async function selectBibliotecaAssetsForProject(
  supabaseClient: BibliotecaSupabaseClient,
  projectId: string,
) {
  const full = await supabaseClient
    .from("assets")
    .select(ASSET_SELECT)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (!isMissingSchemaColumnError(full.error)) {
    return full;
  }

  return supabaseClient
    .from("assets")
    .select(ASSET_SELECT_CORE)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
}

async function selectBibliotecaAssetById(
  supabaseClient: BibliotecaSupabaseClient,
  assetId: string,
) {
  const full = await supabaseClient
    .from("assets")
    .select(ASSET_SELECT)
    .eq("id", assetId)
    .maybeSingle();

  if (!isMissingSchemaColumnError(full.error)) {
    return full;
  }

  return supabaseClient
    .from("assets")
    .select(ASSET_SELECT_CORE)
    .eq("id", assetId)
    .maybeSingle();
}

async function selectBibliotecaAssetsAfterMutation<T>(
  supabaseClient: BibliotecaSupabaseClient,
  run: (
    select: string,
  ) => PromiseLike<{
    data: T | null;
    error: { code?: string } | null;
  }>,
) {
  const full = await run(ASSET_SELECT);

  if (!isMissingSchemaColumnError(full.error)) {
    return full;
  }

  return run(ASSET_SELECT_CORE);
}

function getAuthenticatedClient() {
  return createClient();
}

async function requireUser(): Promise<User> {
  const supabaseClient = getAuthenticatedClient();
  const {
    data: { user },
    error,
  } = await supabaseClient.auth.getUser();

  if (error || !user) {
    throw new BibliotecaAuthError();
  }

  return user;
}

async function resolveBibliotecaUserId(userId?: string): Promise<string> {
  if (userId) {
    return userId;
  }

  const user = await requireUser();
  return user.id;
}

export async function ensureBibliotecaAuthReady(): Promise<void> {
  const supabaseClient = getAuthenticatedClient();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();

    if (session?.access_token) {
      return;
    }

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (user) {
      return;
    }

    if (attempt < 4) {
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
  }
}

async function hydrateAssetUrls(asset: BibliotecaAsset): Promise<BibliotecaAsset> {
  const [originalUrl, imageUrl, teaserUrl, premiumUrl] = await Promise.all([
    resolveLibraryUrl(asset.original_path, asset.original_url),
    resolveLibraryUrl(asset.image_path, asset.image_url),
    resolveLibraryUrl(
      asset.teaser_video_path,
      asset.teaser_video_url ?? asset.video_url,
    ),
    resolveLibraryUrl(asset.premium_video_path, asset.premium_video_url),
  ]);

  return {
    ...asset,
    original_url: originalUrl,
    image_url: imageUrl ?? asset.image_url,
    teaser_video_url: teaserUrl,
    video_url: teaserUrl ?? asset.video_url,
    premium_video_url: premiumUrl,
  };
}

export async function fetchBibliotecaProjects(
  userId?: string,
): Promise<BibliotecaProject[]> {
  const supabaseClient = getAuthenticatedClient();
  const resolvedUserId = await resolveBibliotecaUserId(userId);

  const { data, error } = await supabaseClient
    .from("projects")
    .select(PROJECT_SELECT)
    .eq("user_id", resolvedUserId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchBibliotecaProjects error", { error });
    throw error;
  }

  return (data ?? []) as BibliotecaProject[];
}

export async function createBibliotecaProject(
  name: string,
  metadataOrDescription?: StudioProjectMetadata | string,
): Promise<BibliotecaProject> {
  const supabaseClient = getAuthenticatedClient();
  const user = await requireUser();

  const metadata: StudioProjectMetadata & { description?: string | null } =
    typeof metadataOrDescription === "string"
      ? { description: metadataOrDescription || null }
      : (metadataOrDescription ?? {});

  const insertPayload: ProjectInsertPayload = {
    name,
    user_id: user.id,
    description: metadata.description ?? null,
    workflow_id: metadata.workflow_id ?? null,
    industry: metadata.industry ?? null,
    intended_destination: metadata.intended_destination ?? null,
    destination: metadata.destination ?? null,
  };

  let { data, error } = await supabaseClient
    .from("projects")
    .insert(insertPayload)
    .select(PROJECT_SELECT)
    .single();

  if (error && isMissingSchemaColumnError(error)) {
    const fallbackPayload = withoutProjectDestinationField(insertPayload);
    ({ data, error } = await supabaseClient
      .from("projects")
      .insert(fallbackPayload)
      .select(PROJECT_SELECT)
      .single());
  }

  if (error) {
    logBibliotecaSupabaseError(
      "createBibliotecaProject error",
      insertPayload,
      error,
    );
    throw error;
  }

  return data as BibliotecaProject;
}

export async function updateBibliotecaProject(
  projectId: string,
  metadata: StudioProjectMetadata,
): Promise<void> {
  const supabaseClient = getAuthenticatedClient();
  const user = await requireUser();

  const updatePayload = {
    workflow_id: metadata.workflow_id ?? null,
    industry: metadata.industry ?? null,
    intended_destination: metadata.intended_destination ?? null,
    destination: metadata.destination ?? null,
  };

  let { error } = await supabaseClient
    .from("projects")
    .update(updatePayload)
    .eq("id", projectId)
    .eq("user_id", user.id);

  if (error && isMissingSchemaColumnError(error)) {
    const { destination: _destination, ...fallbackPayload } = updatePayload;
    ({ error } = await supabaseClient
      .from("projects")
      .update(fallbackPayload)
      .eq("id", projectId)
      .eq("user_id", user.id));
  }

  if (error) {
    logBibliotecaSupabaseError(
      "updateBibliotecaProject error",
      updatePayload,
      error,
    );
    throw error;
  }
}

export async function fetchBibliotecaAssets(
  projectId: string,
  userId?: string,
): Promise<BibliotecaAsset[]> {
  const supabaseClient = getAuthenticatedClient();
  const resolvedUserId = await resolveBibliotecaUserId(userId);

  const { data: project, error: projectError } = await supabaseClient
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", resolvedUserId)
    .maybeSingle();

  if (projectError) {
    throw projectError;
  }

  if (!project) {
    throw new Error("Project not found or access denied.");
  }

  const { data, error } = await selectBibliotecaAssetsForProject(
    supabaseClient,
    projectId,
  );

  if (error) {
    throw error;
  }

  const assets = (data ?? []) as BibliotecaAsset[];
  return Promise.all(assets.map(hydrateAssetUrls));
}

export async function fetchBibliotecaAssetById(
  assetId: string,
): Promise<BibliotecaAsset | null> {
  const supabaseClient = getAuthenticatedClient();
  const user = await requireUser();

  const { data, error } = await selectBibliotecaAssetById(
    supabaseClient,
    assetId,
  );

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const { data: project } = await supabaseClient
    .from("projects")
    .select("id")
    .eq("id", data.project_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!project) {
    return null;
  }

  return hydrateAssetUrls(data as BibliotecaAsset);
}

export async function saveBibliotecaAssets(
  assets: Array<
    Omit<BibliotecaAsset, "id" | "created_at"> & { project_id: string }
  >,
): Promise<BibliotecaAsset[]> {
  const supabaseClient = getAuthenticatedClient();
  const user = await requireUser();

  const projectIds = [...new Set(assets.map((asset) => asset.project_id))];

  for (const projectId of projectIds) {
    const { data: project, error: projectError } = await supabaseClient
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (projectError) {
      throw projectError;
    }

    if (!project) {
      throw new Error("Project not found or access denied.");
    }
  }

  const { data, error } = await selectBibliotecaAssetsAfterMutation<
    BibliotecaAsset[]
  >(supabaseClient, (select) =>
    supabaseClient.from("assets").insert(assets).select(select),
  );

  if (error) {
    throw error;
  }

  const saved = (data ?? []) as BibliotecaAsset[];
  return Promise.all(saved.map(hydrateAssetUrls));
}

export async function updateBibliotecaAsset(
  assetId: string,
  updates: Partial<
    Pick<
      BibliotecaAsset,
      | "image_url"
      | "image_path"
      | "video_url"
      | "teaser_video_url"
      | "teaser_video_path"
      | "premium_video_url"
      | "premium_video_path"
      | "share_slug"
      | "visibility"
      | "original_url"
      | "original_path"
      | "image_prompt"
      | "video_prompt"
      | "ai_instructions"
      | "payment_status"
    >
  >,
): Promise<BibliotecaAsset> {
  const supabaseClient = getAuthenticatedClient();
  const user = await requireUser();

  const { data: asset, error: assetError } = await supabaseClient
    .from("assets")
    .select("id, project_id")
    .eq("id", assetId)
    .maybeSingle();

  if (assetError) {
    throw assetError;
  }

  if (!asset) {
    throw new Error("Asset not found or access denied.");
  }

  const { data: project, error: projectError } = await supabaseClient
    .from("projects")
    .select("id")
    .eq("id", asset.project_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (projectError) {
    throw projectError;
  }

  if (!project) {
    throw new Error("Project not found or access denied.");
  }

  const runUpdate = (payload: Partial<BibliotecaAsset>) =>
    selectBibliotecaAssetsAfterMutation<BibliotecaAsset>(
      supabaseClient,
      (select) =>
        supabaseClient
          .from("assets")
          .update(payload)
          .eq("id", assetId)
          .select(select)
          .single(),
    );

  let { data, error } = await runUpdate(updates);

  if (
    error &&
    isMissingSchemaColumnError(error) &&
    (updates.share_slug !== undefined || updates.visibility !== undefined)
  ) {
    ({ data, error } = await runUpdate(withoutShareFields(updates)));
  }

  if (error) {
    throw error;
  }

  return hydrateAssetUrls(data as BibliotecaAsset);
}

export function buildAutoProjectName(customerIntent: string): string {
  const trimmed = customerIntent.trim();
  if (trimmed) {
    return trimmed.length > 48 ? `${trimmed.slice(0, 45)}...` : trimmed;
  }

  const date = new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
  }).format(new Date());

  return `Comercial · ${date}`;
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read blob."));
    reader.readAsDataURL(blob);
  });
}

export async function getBibliotecaUserId(): Promise<string> {
  const user = await requireUser();
  return user.id;
}

export function assetHasTeaser(asset: BibliotecaAsset): boolean {
  return Boolean(
    asset.teaser_video_path ||
      asset.teaser_video_url ||
      asset.video_url,
  );
}

export function getTeaserPlaybackUrl(asset: BibliotecaAsset): string | null {
  return asset.teaser_video_url ?? asset.video_url ?? null;
}

export function isAssetPremiumOwned(asset: BibliotecaAsset): boolean {
  if (asset.payment_status === "paid") {
    return true;
  }

  // Legacy records may have the HD file persisted before payment_status was set.
  return Boolean(asset.premium_video_path);
}

export function getCommercialStatusLabel(
  asset: BibliotecaAsset,
): { label: string; tone: "free" | "pending" | "paid" } {
  if (isAssetPremiumOwned(asset)) {
    return { label: "HD comprado", tone: "paid" };
  }
  if (asset.payment_status === "pending") {
    return { label: "Pago pendiente", tone: "pending" };
  }
  return { label: "Avance gratis", tone: "free" };
}

export function getPublicPreviewUrl(asset: BibliotecaAsset): string | null {
  if (!asset.share_slug) {
    return null;
  }

  return buildPublicPreviewUrl(asset.share_slug);
}

export function assetHasShareSlug(asset: BibliotecaAsset): boolean {
  return Boolean(asset.share_slug);
}

export async function refreshAssetTeaserUrl(
  asset: BibliotecaAsset,
): Promise<string | null> {
  const path = resolveLibraryStoragePath(
    asset.teaser_video_path,
    asset.teaser_video_url ?? asset.video_url,
  );

  if (!path) {
    return getTeaserPlaybackUrl(asset);
  }

  const { createSignedLibraryUrl } = await import("@/lib/library-storage");
  try {
    return await createSignedLibraryUrl(path);
  } catch (error) {
    console.error("refreshAssetTeaserUrl failed", { assetId: asset.id, error });
    return getTeaserPlaybackUrl(asset);
  }
}

export async function refreshAssetPremiumUrl(
  asset: BibliotecaAsset,
): Promise<string | null> {
  const path = resolveLibraryStoragePath(
    asset.premium_video_path,
    asset.premium_video_url,
  );

  if (!path) {
    return asset.premium_video_url ?? null;
  }

  const { createSignedLibraryUrl } = await import("@/lib/library-storage");
  try {
    return await createSignedLibraryUrl(path);
  } catch (error) {
    console.error("refreshAssetPremiumUrl failed", { assetId: asset.id, error });
    return asset.premium_video_url ?? null;
  }
}
