type MetapromLogoProps = {
  className?: string;
  variant?: "dark" | "light";
};

export default function MetapromLogo({
  className = "",
  variant = "dark",
}: MetapromLogoProps) {
  const textColor = variant === "dark" ? "text-neutral-900" : "text-white";

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-cyan-400 shadow-sm">
        <span className="text-lg font-bold text-white">M</span>
      </div>
      <span className={`text-lg font-bold tracking-[0.12em] ${textColor}`}>
        METAPROM
      </span>
    </div>
  );
}
