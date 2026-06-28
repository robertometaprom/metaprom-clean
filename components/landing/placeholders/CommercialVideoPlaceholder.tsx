type CommercialVideoPlaceholderProps = {
  className?: string;
  fullBleed?: boolean;
};

function PlayIcon() {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className="h-10 w-10 md:h-12 md:w-12"
      aria-hidden
    >
      <circle
        cx="24"
        cy="24"
        r="23"
        stroke="currentColor"
        strokeWidth="1"
        className="text-[#F5F5F0]/20"
      />
      <path
        d="M20 16.5v15l12-7.5-12-7.5z"
        fill="currentColor"
        className="text-[#F5F5F0]/70"
      />
    </svg>
  );
}

export default function CommercialVideoPlaceholder({
  className = "",
  fullBleed = false,
}: CommercialVideoPlaceholderProps) {
  return (
    <div
      className={`relative overflow-hidden bg-black ${fullBleed ? "absolute inset-0 h-full w-full" : ""} ${className}`}
      aria-hidden
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#111010] to-[#0d0c0b]" />
      <div className="placeholder-drift absolute inset-[-12%] bg-[radial-gradient(ellipse_at_50%_40%,rgba(245,245,240,0.05)_0%,transparent_60%)]" />
      <div className="placeholder-drift-slow absolute inset-[-12%] bg-[radial-gradient(ellipse_at_20%_70%,rgba(245,245,240,0.03)_0%,transparent_50%)]" />

      <div className="placeholder-light-sweep absolute inset-0 overflow-hidden opacity-60">
        <div className="absolute -inset-full h-[200%] w-1/4 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="placeholder-play-pulse flex flex-col items-center gap-4">
          <PlayIcon />
          {!fullBleed && (
            <p className="text-[10px] uppercase tracking-[0.35em] text-white/35 md:text-xs">
              Commercial Video
            </p>
          )}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent" />
    </div>
  );
}
