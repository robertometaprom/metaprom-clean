import Image from "next/image";
import {
  METAPROM_BRAND_ASSETS,
  type MetapromBrandVariant,
} from "@/lib/brand";

type MetapromLogoProps = {
  className?: string;
  /**
   * Background context for the lockup:
   * - dark → logo for dark backgrounds
   * - light → logo for light backgrounds
   * - symbol → mark only
   */
  variant?: MetapromBrandVariant;
  /** Visible content height in CSS pixels (default 36). */
  height?: number;
  priority?: boolean;
};

export default function MetapromLogo({
  className = "",
  variant = "dark",
  height = 36,
  priority = false,
}: MetapromLogoProps) {
  const asset = METAPROM_BRAND_ASSETS[variant];
  const needsCrop =
    asset.contentHeightRatio != null &&
    asset.contentWidthRatio != null &&
    asset.contentTopRatio != null &&
    asset.contentLeftRatio != null;

  if (!needsCrop) {
    const width = Math.round((asset.width / asset.height) * height);
    return (
      <Image
        src={asset.src}
        alt="Metaprom AI"
        width={asset.width}
        height={asset.height}
        priority={priority}
        className={`inline-block h-auto w-auto shrink-0 ${className}`}
        style={{ height, width }}
      />
    );
  }

  const contentHeightRatio = asset.contentHeightRatio!;
  const contentWidthRatio = asset.contentWidthRatio!;
  const contentTopRatio = asset.contentTopRatio!;
  const contentLeftRatio = asset.contentLeftRatio!;
  const imageHeight = Math.round(height / contentHeightRatio);
  const imageWidth = Math.round((asset.width / asset.height) * imageHeight);
  const frameWidth = Math.round(imageWidth * contentWidthRatio);
  const offsetTop = -Math.round(contentTopRatio * imageHeight);
  const offsetLeft = -Math.round(contentLeftRatio * imageWidth);

  return (
    <span
      className={`relative inline-block shrink-0 overflow-hidden ${className}`}
      style={{ height, width: frameWidth }}
      aria-label="Metaprom AI"
      role="img"
    >
      <Image
        src={asset.src}
        alt="Metaprom AI"
        width={asset.width}
        height={asset.height}
        priority={priority}
        className="absolute max-w-none"
        style={{
          height: imageHeight,
          width: imageWidth,
          top: offsetTop,
          left: offsetLeft,
        }}
      />
    </span>
  );
}
