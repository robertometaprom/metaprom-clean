import MetapromLogo from "@/components/studio/MetapromLogo";

type MetapromInfinityLogoProps = {
  className?: string;
  size?: number;
};

/**
 * Compact/symbol brand mark for cinematic and experience surfaces.
 * Prefer MetapromLogo directly for new call sites.
 */
export default function MetapromInfinityLogo({
  className = "",
  size = 72,
}: MetapromInfinityLogoProps) {
  return (
    <MetapromLogo variant="symbol" height={size} className={className} />
  );
}
