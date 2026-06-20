import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Mode } from "./prompts";

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
  created_at?: string | null;
};

export type BibliotecaAsset = {
  id: string;
  project_id: string;
  original_name?: string | null;
  image_url: string;
  mode: Mode;
  ai_instructions?: string | null;
  created_at?: string | null;
};

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

export async function fetchBibliotecaProjects(): Promise<BibliotecaProject[]> {
  const supabaseClient = getAuthenticatedClient();
  const user = await requireUser();

  const { data, error } = await supabaseClient
    .from("projects")
    .select("id, name, user_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchBibliotecaProjects error", {
      query: "select id, name, user_id, created_at where user_id = auth user",
      table: "projects",
      error,
    });
    throw error;
  }

  return (data ?? []) as BibliotecaProject[];
}

export async function createBibliotecaProject(
  name: string,
  _description?: string
): Promise<BibliotecaProject> {
  const supabaseClient = getAuthenticatedClient();
  const user = await requireUser();

  const insertPayload = {
    name,
    user_id: user.id,
  };

  const { data, error } = await supabaseClient
    .from("projects")
    .insert(insertPayload)
    .select("id, name, user_id, created_at")
    .single();

  if (error) {
    console.error("createBibliotecaProject error", {
      query: "insert into projects (name, user_id)",
      table: "projects",
      insertPayload,
      error,
    });
    throw error;
  }

  return data as BibliotecaProject;
}

export async function fetchBibliotecaAssets(
  projectId: string
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
    .select("id, project_id, original_name, image_url, mode, ai_instructions, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as BibliotecaAsset[];
}

export async function saveBibliotecaAssets(
  assets: Array<
    Omit<BibliotecaAsset, "id" | "created_at"> & { project_id: string }
  >
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
    .select("id, project_id, original_name, image_url, mode, ai_instructions, created_at");

  if (error) {
    throw error;
  }

  return (data ?? []) as BibliotecaAsset[];
}
