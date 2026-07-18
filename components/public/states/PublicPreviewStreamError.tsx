type PublicPreviewStreamErrorProps = {
  message: string;
};

export default function PublicPreviewStreamError({
  message,
}: PublicPreviewStreamErrorProps) {
  return (
    <div className="flex aspect-[9/16] w-full items-center justify-center bg-black md:aspect-video">
      <p className="max-w-xs px-6 text-center text-sm text-white/50">{message}</p>
    </div>
  );
}
