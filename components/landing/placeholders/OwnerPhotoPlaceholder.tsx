type OwnerPhotoPlaceholderProps = {
  className?: string;
};

export default function OwnerPhotoPlaceholder({
  className = "",
}: OwnerPhotoPlaceholderProps) {
  return (
    <div
      className={`absolute inset-0 overflow-hidden rounded-full ${className}`}
      aria-hidden
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a1815] to-[#0f0e0c]" />
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-8 w-8 text-white/25"
          aria-hidden
        >
          <circle cx="12" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.2" />
          <path
            d="M5 19c0-3.3 3.1-6 7-6s7 2.7 7 6"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
}
