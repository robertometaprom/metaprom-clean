import MetapromLogo from "@/components/studio/MetapromLogo";

type HeroBrandLogoProps = {
  className?: string;
};

/** Studio hero brand mark — official dark-background lockup. */
export default function HeroBrandLogo({ className = "" }: HeroBrandLogoProps) {
  return <MetapromLogo variant="dark" height={44} className={className} />;
}
