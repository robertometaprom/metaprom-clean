import { supabase } from "./supabase";
import type { Mode } from "./prompts";

export type BibliotecaProject = {
  id: string;
  name: string;
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

function errorResponse(message: string): never {
  throw new Error(message);
}

function getSupabase() {
  if (!supabase) {
    errorResponse(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return supabase;
}

export async function fetchBibliotecaProjects(): Promise<BibliotecaProject[]> {
  const supabaseClient = getSupabase();
  const { data, error } = await supabaseClient
    .from("projects")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchBibliotecaProjects error", {
      query: "select id, name, created_at",
      table: "projects",
      error,
    });
    throw error;
  }

  return (data ?? []) as BibliotecaProject[];
}

export async function createBibliotecaProject(
  name: string,
  description?: string
): Promise<BibliotecaProject> {
  const supabaseClient = getSupabase();
  const { data, error } = await supabaseClient
    .from("projects")
    .insert({ name })
    .select("id, name, created_at")
    .single();

  if (error) {
    console.error("createBibliotecaProject error", {
      query: "insert into projects (name)",
      table: "projects",
      error,
    });
    throw error;
  }

  return data as BibliotecaProject;
}

export async function fetchBibliotecaAssets(
  projectId: string
): Promise<BibliotecaAsset[]> {
  const { data, error } = await getSupabase()
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
  const { data, error } = await getSupabase()
    .from("assets")
    .insert(assets)
    .select("id, project_id, original_name, image_url, mode, ai_instructions, created_at");

  if (error) {
    throw error;
  }

  return (data ?? []) as BibliotecaAsset[];
}
