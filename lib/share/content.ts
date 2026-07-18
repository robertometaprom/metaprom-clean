import type { Locale } from "@/lib/i18n";

export type ShareCommercialContent = {
  shareLabel: string;
  shareCommercial: string;
  copyLink: string;
  copyLinkSuccess: string;
  copyLinkError: string;
  whatsapp: string;
  facebook: string;
  linkedin: string;
  x: string;
  email: string;
  closeMenu: string;
};

const CONTENT: Record<Locale, ShareCommercialContent> = {
  es: {
    shareLabel: "Compartir",
    shareCommercial: "Compartir comercial",
    copyLink: "Copiar enlace",
    copyLinkSuccess: "Enlace copiado",
    copyLinkError: "No se pudo copiar el enlace",
    whatsapp: "WhatsApp",
    facebook: "Facebook",
    linkedin: "LinkedIn",
    x: "X",
    email: "Correo",
    closeMenu: "Cerrar menú",
  },
  en: {
    shareLabel: "Share",
    shareCommercial: "Share commercial",
    copyLink: "Copy link",
    copyLinkSuccess: "Link copied",
    copyLinkError: "Could not copy link",
    whatsapp: "WhatsApp",
    facebook: "Facebook",
    linkedin: "LinkedIn",
    x: "X",
    email: "Email",
    closeMenu: "Close menu",
  },
};

export function getShareCommercialContent(
  locale: Locale = "es",
): ShareCommercialContent {
  return CONTENT[locale] ?? CONTENT.es;
}

export function getClientLocale(): Locale {
  if (typeof document === "undefined") {
    return "es";
  }

  const match = document.cookie.match(/(?:^|;\s*)locale=([^;]+)/);
  const value = match?.[1];

  return value === "en" ? "en" : "es";
}
