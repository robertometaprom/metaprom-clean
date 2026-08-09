import type { Locale } from "@/lib/i18n";

export type ShareCommercialContent = {
  shareLabel: string;
  shareCommercial: string;
  copyLink: string;
  copyLinkSuccess: string;
  copyLinkError: string;
  whatsapp: string;
  whatsappCta: string;
  whatsappQrInstruction: string;
  whatsappQrHint: string;
  whatsappOpenOnDesktop: string;
  facebook: string;
  linkedin: string;
  x: string;
  email: string;
  closeMenu: string;
  closePanel: string;
};

const CONTENT: Record<Locale, ShareCommercialContent> = {
  es: {
    shareLabel: "Compartir",
    shareCommercial: "Compartir comercial",
    copyLink: "Copiar enlace",
    copyLinkSuccess: "Enlace copiado",
    copyLinkError: "No se pudo copiar el enlace",
    whatsapp: "WhatsApp",
    whatsappCta: "WHATSAPP · COMPARTIR AHORA",
    whatsappQrInstruction: "ESCANEA Y COMPÁRTELO",
    whatsappQrHint: "Apunta tu celular al QR",
    whatsappOpenOnDesktop: "Abrir WhatsApp en esta PC",
    facebook: "Facebook",
    linkedin: "LinkedIn",
    x: "X",
    email: "Correo",
    closeMenu: "Cerrar menú",
    closePanel: "Cerrar",
  },
  en: {
    shareLabel: "Share",
    shareCommercial: "Share commercial",
    copyLink: "Copy link",
    copyLinkSuccess: "Link copied",
    copyLinkError: "Could not copy link",
    whatsapp: "WhatsApp",
    whatsappCta: "WHATSAPP · SHARE NOW",
    whatsappQrInstruction: "SCAN AND SHARE IT",
    whatsappQrHint: "Point your phone at the QR",
    whatsappOpenOnDesktop: "Open WhatsApp on this PC",
    facebook: "Facebook",
    linkedin: "LinkedIn",
    x: "X",
    email: "Email",
    closeMenu: "Close menu",
    closePanel: "Close",
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
