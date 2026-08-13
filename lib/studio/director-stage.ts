/**
 * Presentational constants for the Creative Director stage shell (UX2 visual).
 *
 * Approved final assets (do not replace/regenerate):
 *   public/studio/director-artwork.png
 *   public/studio/metaprom-production-backdrop.png
 */
export const DIRECTOR_ARTWORK_SRC = "/studio/director-artwork.png";
export const PRODUCTION_BACKDROP_SRC =
  "/studio/metaprom-production-backdrop.png";

export type DirectorStageMode = "talking" | "working";

/**
 * Talking overlay sits in `main` (z-10) under StudioShell header (z-30).
 * Clear header (logo h-9 + py-4 ≈ 4.25rem / ~5rem with border) plus modest
 * breathing room. Mobile uses a slightly tighter inset so the composer stays
 * reachable; desktop gets the full ~24–40px breath. Working mode must not use
 * this — it already flows below the header in document layout.
 */
export const DIRECTOR_TALKING_TOP_INSET_CLASS =
  "pt-20 md:pt-24 lg:pt-[6.5rem]";
