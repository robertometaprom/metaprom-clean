type HeroBrandLogoProps = {
  className?: string;
};

export default function HeroBrandLogo({ className = "" }: HeroBrandLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        width="40"
        height="40"
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <linearGradient id="hero-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9333EA" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
        </defs>
        <path
          d="M12 20 C12 12 16 8 20 12 C24 16 28 12 28 20 C28 28 24 32 20 28 C16 24 12 28 12 20Z"
          stroke="url(#hero-logo-grad)"
          strokeWidth="2.5"
          fill="none"
        />
        <path
          d="M20 12 C24 8 28 12 28 20 C28 28 24 32 20 28"
          stroke="url(#hero-logo-grad)"
          strokeWidth="2.5"
          fill="none"
          opacity="0.85"
        />
      </svg>
      <div className="leading-none">
        <div className="text-lg font-bold tracking-[0.14em] text-white">METAPROM</div>
        <div className="mt-1 text-[11px] font-semibold tracking-[0.22em] text-violet-400">
          AI STUDIO
        </div>
      </div>
    </div>
  );
}
