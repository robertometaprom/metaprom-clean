import {
  PLATFORM_MARK_LAYOUT_CLASS,
  type PlatformMarkAsset,
} from "@/lib/platform-marks";

type PlatformMarkProps = {
  mark: PlatformMarkAsset;
  name: string;
  className?: string;
};

export default function PlatformMark({
  mark,
  name,
  className = "",
}: PlatformMarkProps) {
  return (
    <img
      src={mark.src}
      alt={name}
      width={mark.width}
      height={mark.height}
      draggable={false}
      className={`${PLATFORM_MARK_LAYOUT_CLASS[mark.layout]} ${className}`.trim()}
    />
  );
}
