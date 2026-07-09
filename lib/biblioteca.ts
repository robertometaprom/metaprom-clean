import { createClient } from "@/lib/supabase/client";
import { resolveLibraryUrl } from "@/lib/library-storage";
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
  image_prompt?: string | null;
  video_prompt?: string | null;
  mode: Mode;
  ai_instructions?: string | null;
  workflow_id?: string | null;
  industry?: string | null;
  payment_status?: AssetPaymentStatus;
  created_at?: string | null;
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

const ASSET_SELECT =
  "id, project_id, original_name, original_url, original_path, image_url, image_path, video_url, teaser_video_url, teaser_video_path, premium_video_url, premium_video_path, image_prompt, video_prompt, mode, ai_instructions, workflow_id, industry, payment_status, created_at";

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

export async function fetchBibliotecaProjects(): Promise<BibliotecaProject[]> {
  const supabaseClient = getAuthenticatedClient();
  const user = await requireUser();

  const { data, error } = await supabaseClient
    .from("projects")
    .select(
      "id, name, user_id, workflow_id, industry, intended_destination, destination, created_at",
    )
    .eq("user_id", user.id)
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

  const insertPayload = {
    name,
    user_id: user.id,
    description: metadata.description ?? null,
    workflow_id: metadata.workflow_id ?? null,
    industry: metadata.industry ?? null,
    intended_destination: metadata.intended_destination ?? null,
    destination: metadata.destination ?? null,
  };

  const { data, error } = await supabaseClient
    .from("projects")
    .insert(insertPayload)
    .select(
      "id, name, user_id, workflow_id, industry, intended_destination, destination, created_at",
    )
    .single();

  if (error) {
    console.error("createBibliotecaProject error", { insertPayload, error });
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

  const { error } = await supabaseClient
    .from("projects")
    .update({
      workflow_id: metadata.workflow_id ?? null,
      industry: metadata.industry ?? null,
      intended_destination: metadata.intended_destination ?? null,
      destination: metadata.destination ?? null,
    })
    .eq("id", projectId)
    .eq("user_id", user.id);

  if (error) {
    throw error;
  }
}

export async function fetchBibliotecaAssets(
  projectId: string,
): Promise<BibliotecaAsset[]> {
  const supabaseClient = getAuthenticatedClient();
  const user = await requireUser();

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

  const { data, error } = await supabaseClient
    .from("assets")
    .select(ASSET_SELECT)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

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

  const { data, error } = await supabaseClient
    .from("assets")
    .select(ASSET_SELECT)
    .eq("id", assetId)
    .maybeSingle();

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

  const { data, error } = await supabaseClient
    .from("assets")
    .insert(assets)
    .select(ASSET_SELECT);

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

  const { data, error } = await supabaseClient
    .from("assets")
    .update(updates)
    .eq("id", assetId)
    .select(ASSET_SELECT)
    .single();

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

export function getCommercialStatusLabel(
  asset: BibliotecaAsset,
): { label: string; tone: "free" | "pending" | "paid" } {
  if (asset.payment_status === "paid") {
    return { label: "HD comprado", tone: "paid" };
  }
  if (asset.payment_status === "pending") {
    return { label: "Pago pendiente", tone: "pending" };
  }
  return { label: "Avance gratis", tone: "free" };
}

export async function refreshAssetTeaserUrl(
  asset: BibliotecaAsset,
): Promise<string | null> {
  if (!asset.teaser_video_path) {
    return getTeaserPlaybackUrl(asset);
  }

  const { createSignedLibraryUrl } = await import("@/lib/library-storage");
  try {
    return await createSignedLibraryUrl(asset.teaser_video_path);
  } catch (error) {
    console.error("refreshAssetTeaserUrl failed", { assetId: asset.id, error });
    return getTeaserPlaybackUrl(asset);
  }
}

export async function refreshAssetPremiumUrl(
  asset: BibliotecaAsset,
): Promise<string | null> {
  if (!asset.premium_video_path) {
    return asset.premium_video_url ?? null;
  }

  const { createSignedLibraryUrl } = await import("@/lib/library-storage");
  try {
    return await createSignedLibraryUrl(asset.premium_video_path);
  } catch (error) {
    console.error("refreshAssetPremiumUrl failed", { assetId: asset.id, error });
    return asset.premium_video_url ?? null;
  }
}
