import PublicPreviewStateShell, {
  PublicPreviewStateAction,
} from "@/components/public/states/PublicPreviewStateShell";
import type { PublicCommercialContent } from "@/lib/public-commercial/content";

type PublicPreviewNotFoundProps = {
  labels: PublicCommercialContent["states"]["notFound"] & {
    ctaLabel: string;
    ctaHref: string;
  };
};

export default function PublicPreviewNotFound({ labels }: PublicPreviewNotFoundProps) {
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
