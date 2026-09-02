const SLUG_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const SHARE_SLUG_LENGTH = 11;

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

export async function createUniqueShareSlug(
  persist: (slug: string) => Promise<void>,
  maxAttempts = 12,
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const slug = generateShareSlug();

    try {
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
