import { createClient } from "@/lib/supabase/client";

export const LIBRARY_BUCKET = "library";

const SIGNED_URL_TTL_SECONDS = 60 * 60;
const LIBRARY_OBJECT_URL_PATTERN =
  /\/storage\/v1\/object\/(?:sign|public)\/library\/([^?]+)/;

export function extractLibraryObjectPathFromUrl(
  url: string | null | undefined,
): string | null {
  if (!url) return null;

  const match = url.match(LIBRARY_OBJECT_URL_PATTERN);
  if (!match?.[1]) return null;

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function isSignedLibraryObjectUrl(
  url: string | null | undefined,
): boolean {
  return Boolean(url && url.includes("/object/sign/library/"));
}

export function resolveLibraryStoragePath(
  path: string | null | undefined,
  fallbackUrl: string | null | undefined,
): string | null {
  if (path) return path;
  return extractLibraryObjectPathFromUrl(fallbackUrl);
}

export type LibraryUploadInput = {
  userId: string;
  projectId: string;
  assetId: string;
  kind: "original" | "enhanced" | "teaser" | "premium";
  file: Blob | File;
  contentType: string;
  extension: string;
};

export function buildLibraryObjectPath(input: {
  userId: string;
  projectId: string;
  assetId: string;
  kind: LibraryUploadInput["kind"];
  extension: string;
}): string {
  const filename = `${input.kind}.${input.extension.replace(/^\./, "")}`;
  return `${input.userId}/${input.projectId}/${input.assetId}/${filename}`;
}

export async function uploadLibraryObject(
  input: LibraryUploadInput,
): Promise<{ path: string; publicUrl: string }> {
  const supabase = createClient();
  const path = buildLibraryObjectPath(input);

  const { error } = await supabase.storage
    .from(LIBRARY_BUCKET)
    .upload(path, input.file, {
      upsert: true,
      contentType: input.contentType,
    });

  if (error) {
    throw error;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(LIBRARY_BUCKET).getPublicUrl(path);

  return { path, publicUrl };
}

export async function createSignedLibraryUrl(path: string): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase.storage
    .from(LIBRARY_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    throw error ?? new Error("Failed to create signed URL.");
  }

  return data.signedUrl;
}

export async function resolveLibraryUrl(
  path: string | null | undefined,
  fallbackUrl: string | null | undefined,
): Promise<string | null> {
  const resolvedPath = resolveLibraryStoragePath(path, fallbackUrl);

  if (resolvedPath) {
    try {
      return await createSignedLibraryUrl(resolvedPath);
    } catch (error) {
      console.error("resolveLibraryUrl: signed URL failed", {
        path: resolvedPath,
        error,
      });
      if (
        fallbackUrl &&
        !fallbackUrl.startsWith("blob:") &&
        !isSignedLibraryObjectUrl(fallbackUrl)
      ) {
        return fallbackUrl;
      }
      return null;
    }
  }

  if (fallbackUrl?.startsWith("blob:")) {
    return null;
  }

  if (isSignedLibraryObjectUrl(fallbackUrl)) {
    return null;
  }

  return fallbackUrl ?? null;
}

export async function downloadFromUrl(
  url: string,
  filename: string,
): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed (${response.status}).`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mime });
}

export function inferExtensionFromMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "video/mp4":
      return "mp4";
    default:
      return "bin";
  }
}
