/**
 * Canonical Metaprom AI Brand Pack paths.
 * Use MetapromLogo for UI marks — do not scatter these paths ad hoc.
 */
export const METAPROM_BRAND = {
  logoDark: "/brand/metaprom-logo-dark.png",
  logoLight: "/brand/metaprom-logo-light.png",
  /** Mobile landing lockup — symbol + wordmark, no slogan */
  logoCompact: "/brand/metaprom-logo-compact-v2.png",
  symbol: "/brand/metaprom-symbol.png",
  icon: "/brand/metaprom-icon.png",
  /** Marketing only — never use as navbar/header logo */
  banner: "/brand/metaprom-banner.png",
  /** Reference only — do not ship in product UI */
  brandMaster: "/brand/metaprom-brand-master.png",
} as const;

export type MetapromBrandVariant = "dark" | "light" | "symbol" | "compact";

type BrandAssetMeta = {
  src: string;
  width: number;
  height: number;
  /**
   * Optional CSS crop for padded canvases (symbol).
   * Dark/light/compact lockups are full assets — omit these.
   */
  contentTopRatio?: number;
  contentHeightRatio?: number;
  contentLeftRatio?: number;
  contentWidthRatio?: number;
};

export const METAPROM_BRAND_ASSETS: Record<MetapromBrandVariant, BrandAssetMeta> =
  {
    // Pre-cropped UI lockups (symbol + wordmark)
    dark: {
      src: METAPROM_BRAND.logoDark,
      width: 1463,
      height: 248,
    },
    light: {
      src: METAPROM_BRAND.logoLight,
      width: 1205,
      height: 218,
    },
    // Mobile lockup (symbol + METAPROM AI, no slogan) — render full asset, no crop
    compact: {
      src: METAPROM_BRAND.logoCompact,
      width: 1498,
      height: 233,
    },
    // Padded symbol canvas — crop to opaque mark
    symbol: {
      src: METAPROM_BRAND.symbol,
      width: 1536,
      height: 1024,
      contentTopRatio: 134 / 1024,
      contentHeightRatio: 797 / 1024,
      contentLeftRatio: 65 / 1536,
      contentWidthRatio: 1407 / 1536,
    },
  };

