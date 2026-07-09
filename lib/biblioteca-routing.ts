export type BibliotecaFocus = {
  projectId?: string;
  assetId?: string;
};

export const BIBLIOTECA_QUERY_FLAG = "biblioteca";
export const BIBLIOTECA_STUDIO_PATH = "/studio";

export function buildBibliotecaStudioUrl(
  focus?: BibliotecaFocus | null,
): string {
  const params = new URLSearchParams({ [BIBLIOTECA_QUERY_FLAG]: "1" });
  if (focus?.projectId) params.set("project", focus.projectId);
  if (focus?.assetId) params.set("asset", focus.assetId);
  return `${BIBLIOTECA_STUDIO_PATH}?${params.toString()}`;
}

export function readBibliotecaFocusFromSearchParams(
  params: URLSearchParams,
): BibliotecaFocus | null {
  if (!params.get(BIBLIOTECA_QUERY_FLAG)) return null;

  return {
    projectId: params.get("project") ?? undefined,
    assetId: params.get("asset") ?? undefined,
  };
}

export function readBibliotecaFocusFromLocation(): BibliotecaFocus | null {
  if (typeof window === "undefined") return null;
  return readBibliotecaFocusFromSearchParams(
    new URLSearchParams(window.location.search),
  );
}

export function clearBibliotecaQueryFromUrl(): void {
  if (typeof window === "undefined") return;
  window.history.replaceState({}, "", BIBLIOTECA_STUDIO_PATH);
}
