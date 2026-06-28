type BeforePhotoPlaceholderProps = {
  className?: string;
};

export default function BeforePhotoPlaceholder({
  className = "",
}: BeforePhotoPlaceholderProps) {
  return (
    <div
      className={`absolute inset-0 overflow-hidden ${className}`}
      aria-hidden
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#141210] via-[#0f0e0c] to-[#1a1714]" />
      <div className="placeholder-drift absolute inset-[-8%] bg-gradient-to-tr from-transparent via-white/[0.03] to-transparent" />

      <div className="absolute inset-5 rounded-sm border border-white/[0.08] md:inset-8" />
      <div className="absolute left-5 top-5 h-4 w-4 border-l border-t border-white/20 md:left-8 md:top-8" />
      <div className="absolute right-5 top-5 h-4 w-4 border-r border-t border-white/20 md:right-8 md:top-8" />
      <div className="absolute bottom-5 left-5 h-4 w-4 border-b border-l border-white/20 md:bottom-8 md:left-8" />
      <div className="absolute bottom-5 right-5 h-4 w-4 border-b border-r border-white/20 md:bottom-8 md:right-8" />

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        <div className="h-px w-10 bg-white/15" />
        <p className="text-[10px] uppercase tracking-[0.35em] text-white/40 md:text-xs">
          Before Photo
        </p>
        <div className="h-px w-10 bg-white/15" />
      </div>
    </div>
  );
}
