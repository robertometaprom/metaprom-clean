import PublicPreviewStateShell, {
  PublicPreviewStateAction,
} from "@/components/public/states/PublicPreviewStateShell";
import type { PublicCommercialContent } from "@/lib/public-commercial/content";

type PublicPreviewUnavailableProps = {
  labels: PublicCommercialContent["states"]["unavailable"] & {
    ctaLabel: string;
    ctaHref: string;
  };
};

export default function PublicPreviewUnavailable({
  labels,
}: PublicPreviewUnavailableProps) {
  return (
    <PublicPreviewStateShell
      title={labels.title}
      description={labels.description}
      action={
        <PublicPreviewStateAction href={labels.ctaHref} label={labels.ctaLabel} />
      }
    />
  );
}
