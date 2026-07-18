import PublicPreviewStateShell, {
  PublicPreviewStateAction,
} from "@/components/public/states/PublicPreviewStateShell";
import type { PublicCommercialContent } from "@/lib/public-commercial/content";

type PublicPreviewInvalidSlugProps = {
  labels: PublicCommercialContent["states"]["invalidSlug"] & {
    ctaLabel: string;
    ctaHref: string;
  };
};

export default function PublicPreviewInvalidSlug({
  labels,
}: PublicPreviewInvalidSlugProps) {
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
