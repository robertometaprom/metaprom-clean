import type { PlatformMarkAsset } from "@/lib/platform-marks";

type PlatformMarkProps = {
  mark: PlatformMarkAsset;
  name: string;
  className?: string;
};

export default function PlatformMark({
  mark,
  name,
  className = "h-8 w-auto max-w-full md:h-10",
}: PlatformMarkProps) {
  return (
    <img
      src={mark.src}
      alt={name}
      width={mark.width}
      height={mark.height}
      className={className}
    />
  );
}
