type MetapromInfinityLogoProps = {
  className?: string;
  size?: number;
};

export default function MetapromInfinityLogo({
  className = "",
  size = 72,
}: MetapromInfinityLogoProps) {
  return (
    <div
      className={`flex flex-col items-center gap-4 ${className}`}
      aria-hidden
    >
      <svg
        width={size}
        height={size * 0.5}
        viewBox="0 0 120 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-[0_0_24px_rgba(139,92,246,0.45)]"
      >
        <defs>
          <linearGradient id="infinity-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="50%" stopColor="#A855F7" />
            <stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>
        </defs>
        <path
          d="M30 30 C30 12 48 12 60 30 C72 48 90 48 90 30 C90 12 72 12 60 30 C48 48 30 48 30 30Z"
          stroke="url(#infinity-gradient)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      <span className="text-sm font-semibold tracking-[0.28em] text-white/90">
        METAPROM
      </span>
    </div>
  );
}
