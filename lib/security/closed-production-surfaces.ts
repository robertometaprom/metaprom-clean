/**
 * Obsolete, diagnostic, backup, and internal-test surfaces.
 *
 * These must not be publicly reachable in production. They remain available
 * under `next dev` so local tooling (especially `/video-test`) is not destroyed.
 *
 * `/admin/dashboard` is a different authenticated internal tool and is not closed.
 */

export const CLOSED_PRODUCTION_SURFACE_PATHS = [
  "/dashboard",
  "/dashboard_backup",
  "/test",
  "/video-test",
  "/api/diagnose",
  "/api/video-test",
] as const;

export function normalizePathname(pathname: string): string {
  const path = pathname.split("?")[0] ?? pathname;
  if (!path || path === "/") return "/";
  return path.replace(/\/+$/, "") || "/";
}

export function isClosedProductionSurfacePath(pathname: string): boolean {
  const path = normalizePathname(pathname);
  return CLOSED_PRODUCTION_SURFACE_PATHS.some(
    (closed) => path === closed || path.startsWith(`${closed}/`),
  );
}

export function shouldCloseProductionSurfaces(
  nodeEnv: string | undefined = process.env.NODE_ENV,
): boolean {
  return nodeEnv === "production";
}

export function isClosedPublicProductionPath(
  pathname: string,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): boolean {
  return (
    shouldCloseProductionSurfaces(nodeEnv) &&
    isClosedProductionSurfacePath(pathname)
  );
}
