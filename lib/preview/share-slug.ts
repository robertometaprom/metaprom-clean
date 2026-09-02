import type { SupabaseClient } from "@supabase/supabase-js";

const SLUG_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const SHARE_SLUG_LENGTH = 11;

const SHARE_SLUG_UNIQUE_VIOLATION = { code: "23505" } as const;

export function generateShareSlug(): string {
  const bytes = new Uint8Array(SHARE_SLUG_LENGTH);
  crypto.getRandomValues(bytes);

  return Array.from(
    bytes,
    (value) => SLUG_ALPHABET[value % SLUG_ALPHABET.length],
  ).join("");
}

export function isValidShareSlug(value: string): boolean {
  if (value.length !== SHARE_SLUG_LENGTH) {
    return false;
  }

  for (const char of value) {
    if (!SLUG_ALPHABET.includes(char)) {
      return false;
    }
  }

  return true;
}

export function isShareSlugUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error ? String((error as { code: unknown }).code) : "";
  return code === "23505";
}

export type CreateUniqueShareSlugOptions = {
  maxAttempts?: number;
  /** When provided, slugs that return true are skipped before persist. */
  isTaken?: (slug: string) => Promise<boolean>;
};

export async function isShareSlugTakenInAssets(
  supabase: SupabaseClient,
  slug: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("assets")
    .select("id")
    .eq("share_slug", slug)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function isShareSlugTakenInStudioDrafts(
  supabase: SupabaseClient,
  slug: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("studio_drafts")
    .select("id")
    .eq("share_slug", slug)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

/** Slug must be absent from both assets and studio_drafts before minting. */
export async function isShareSlugTakenAcrossTables(
  supabase: SupabaseClient,
  slug: string,
): Promise<boolean> {
  const [inAssets, inDrafts] = await Promise.all([
    isShareSlugTakenInAssets(supabase, slug),
    isShareSlugTakenInStudioDrafts(supabase, slug),
  ]);

  return inAssets || inDrafts;
}

export async function reserveShareSlugAcrossTables(
  supabase: SupabaseClient,
  slug: string,
): Promise<void> {
  if (await isShareSlugTakenAcrossTables(supabase, slug)) {
    throw SHARE_SLUG_UNIQUE_VIOLATION;
  }
}

export async function createUniqueShareSlug(
  persist: (slug: string) => Promise<void>,
  options: CreateUniqueShareSlugOptions = {},
): Promise<string> {
  const maxAttempts = options.maxAttempts ?? 12;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const slug = generateShareSlug();

    try {
      if (options.isTaken && (await options.isTaken(slug))) {
        continue;
      }

      await persist(slug);
      return slug;
    } catch (error) {
      if (isShareSlugUniqueViolation(error)) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Unable to generate a unique share slug.");
}
