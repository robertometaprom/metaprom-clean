import type { PlatformId } from "@/lib/studio-atmosphere";

type PlatformLogoProps = {
  platform: PlatformId;
  className?: string;
};

export default function PlatformLogo({ platform, className = "" }: PlatformLogoProps) {
  const shared = `h-full w-full ${className}`;

  switch (platform) {
    case "instagram":
      return (
        <svg className={shared} viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
        </svg>
      );
    case "facebook":
      return (
        <svg className={shared} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M13.5 9.5V7.8c0-.8.6-1.3 1.4-1.3h2V3h-3.4C10.9 3 9.5 4.8 9.5 7.2V9.5H7v3.5h2.5V21h4V13h2.7l.3-3.5H13.5z" />
        </svg>
      );
    case "youtube":
      return (
        <svg className={shared} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18 5 12 5 12 5s-6 0-7.8.4a2.5 2.5 0 0 0-1.8 1.8C2 9 2 12 2 12s0 3 .4 4.8a2.5 2.5 0 0 0 1.8 1.8C6 19 12 19 12 19s6 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.4-1.8.4-4.8.4-4.8s0-3-.4-4.8zM10 15.5v-7l6 3.5-6 3.5z" />
        </svg>
      );
    case "tiktok":
      return (
        <svg className={shared} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M16.6 5.8a4.2 4.2 0 0 0 3.4-4.1V1h-3.3a6.8 6.8 0 0 1-6.8 6.8v3.1a3.9 3.9 0 0 0-2.2-.7 3.9 3.9 0 0 0 0 7.8 3.9 3.9 0 0 0 3.9-3.9V9.3a8.5 8.5 0 0 0 5 1.6V7.6a5.2 5.2 0 0 1-3.4-1.8z" />
        </svg>
      );
    case "amazon":
      return (
        <svg className={shared} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M14.1 17.5c-3.8 2.8-9.3 4.3-14 3.7-.3 0-.6.3-.4.6 3.2 2.7 7.5 4.3 12.1 4.3 3.5 0 6.8-1.1 9.5-3-.3-.4-.7-.8-1.2-1.6z" />
          <path d="M15.6 15.8c.1-.1.2-.3.1-.5-1.1-1.6-3-2.4-5.1-2.4-2.1 0-3.9.8-5.1 2.4-.1.2 0 .4.1.5 1.3 1.1 3 1.7 4.9 1.7 1.9 0 3.6-.6 5.1-1.7z" />
          <path d="M6.2 8.5h11.6l-.5 1.2H6.7l-.5-1.2z" />
        </svg>
      );
    case "mercado-libre":
      return (
        <svg className={shared} viewBox="0 0 24 24" fill="none" aria-hidden>
          <ellipse cx="12" cy="14" rx="9" ry="4" stroke="currentColor" strokeWidth="1.5" />
          <path d="M6 10c1.5-2.5 4-4 6-4s4.5 1.5 6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "shopify":
      return (
        <svg className={shared} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M15.3 3c-.1 0-1.9.1-1.9.1s-.4-.4-.9-.4H9.1C8.5 2.7 8 3.2 8 3.8v.4S6.2 4.3 6.1 4.3C6 4.3 5.9 4.4 5.9 4.5c-.1.3-.9 6.8-.9 6.8l8.8 1.6V3.1c0-.1-.1-.1-.2-.1h1.7zM12.4 6.5l-.6 2.1s-.5-.2-1.1-.2c-.9 0-1 .6-1 .8 0 .9 2 1.3 2 3.5 0 1.7-1.1 2.9-2.6 2.9-1.8 0-2.7-1.1-2.7-1.1l.5-2c.1 0 1.2 1 2.1 1 .6 0 .9-.5.9-.9 0-1.5-2.6-1.6-2.6-3.9 0-1.7 1.2-3.4 3.7-3.4.9 0 1.4.3 1.4.3z" />
        </svg>
      );
  }
}
