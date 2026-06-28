type PremiumResultPlaceholderProps = {
  className?: string;
};

export default function PremiumResultPlaceholder({
  className = "",
}: PremiumResultPlaceholderProps) {
  return (
    <div
      className={`absolute inset-0 overflow-hidden ${className}`}
      aria-hidden
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#16140f] via-[#0c0b0a] to-[#1c1812]" />
      <div className="placeholder-drift absolute inset-[-10%] bg-[radial-gradient(ellipse_at_30%_20%,rgba(245,245,240,0.06)_0%,transparent_55%)]" />
      <div className="placeholder-drift absolute inset-[-10%] bg-[radial-gradient(ellipse_at_75%_80%,rgba(245,245,240,0.04)_0%,transparent_50%)]" />

      <div className="placeholder-light-sweep absolute inset-0 overflow-hidden">
        <div className="absolute -inset-full h-[200%] w-1/3 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
      </div>

      <div className="absolute inset-4 rounded-sm border border-[#F5F5F0]/10 md:inset-6" />

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
        <div className="flex items-center gap-3">
          <div className="h-px w-8 bg-gradient-to-r from-transparent to-[#F5F5F0]/25" />
          <div className="h-1 w-1 rounded-full bg-[#F5F5F0]/30" />
          <div className="h-px w-8 bg-gradient-to-l from-transparent to-[#F5F5F0]/25" />
        </div>
        <p className="text-[10px] uppercase tracking-[0.4em] text-[#F5F5F0]/55 md:text-xs">
          Premium Result
        </p>
        <div className="flex items-center gap-3">
          <div className="h-px w-8 bg-gradient-to-r from-transparent to-[#F5F5F0]/25" />
          <div className="h-1 w-1 rounded-full bg-[#F5F5F0]/30" />
          <div className="h-px w-8 bg-gradient-to-l from-transparent to-[#F5F5F0]/25" />
        </div>
      </div>
    </div>
  );
}
