import type { PublicCommercialContent } from "@/lib/public-commercial/content";

type PublicPreviewLoadingProps = {
  labels: Pick<PublicCommercialContent, "loadingLabel">;
};

export default function PublicPreviewLoading({
  labels,
}: PublicPreviewLoadingProps) {
  return (
    <main className="min-h-screen bg-black text-[#F5F5F0]">
      <div className="mx-auto w-full max-w-lg px-4 py-6 md:max-w-2xl md:py-10">
        <div
          className="aspect-[9/16] w-full animate-pulse rounded-sm bg-white/5 md:aspect-video"
          aria-hidden
        />
        <p className="sr-only">{labels.loadingLabel}</p>
        <div className="mt-8 space-y-3">
          <div className="mx-auto h-4 w-56 animate-pulse rounded bg-white/5" />
          <div className="mx-auto h-11 w-40 animate-pulse rounded-full bg-white/5" />
        </div>
        <div className="mt-10">
          <div className="mb-3 h-3 w-24 animate-pulse rounded bg-white/5" />
          <div className="aspect-[4/3] w-full animate-pulse rounded-sm bg-white/5" />
        </div>
      </div>
    </main>
  );
}
