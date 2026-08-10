import type { Locale } from "@/lib/i18n";

export type PublicCommercialContent = {
  transformationLine: string;
  imageTransformationLine: string;
  ctaLabel: string;
  ctaHref: string;
  originalPhotoLabel: string;
  commercialLabel: string;
  imageLabel: string;
  imageUnavailableLabel: string;
  footerBrand: string;
  footerTagline: string;
  loadingLabel: string;
  streamErrorLabel: string;
  unmuteLabel: string;
  playLabel: string;
  states: {
    notFound: {
      title: string;
      description: string;
    };
    unavailable: {
      title: string;
      description: string;
    };
    invalidSlug: {
      title: string;
      description: string;
    };
  };
};

const CONTENT: Record<Locale, PublicCommercialContent> = {
  es: {
    transformationLine: "Comercial creado a partir de una sola foto.",
    imageTransformationLine: "Imagen publicitaria creada con Metaprom.",
    ctaLabel: "Crea el tuyo gratis",
    ctaHref: "/studio",
    originalPhotoLabel: "Foto original",
    commercialLabel: "Comercial",
    imageLabel: "Imagen publicitaria",
    imageUnavailableLabel: "No se pudo cargar la imagen.",
    footerBrand: "Metaprom",
    footerTagline: "Marketing premium para tu negocio.",
    loadingLabel: "Cargando comercial…",
    streamErrorLabel: "No se pudo reproducir el comercial.",
    unmuteLabel: "Activar sonido",
    playLabel: "Reproducir",
    states: {
      notFound: {
        title: "Comercial no encontrado",
        description: "Este enlace ya no existe o fue eliminado.",
      },
      unavailable: {
        title: "Comercial no disponible",
        description: "Este comercial no está disponible de forma pública.",
      },
      invalidSlug: {
        title: "Enlace no válido",
        description: "El enlace que abriste no es válido.",
      },
    },
  },
  en: {
    transformationLine: "Commercial created from a single photo.",
    imageTransformationLine: "Advertising image created with Metaprom.",
    ctaLabel: "Create yours free",
    ctaHref: "/studio",
    originalPhotoLabel: "Original photo",
    commercialLabel: "Commercial",
    imageLabel: "Advertising image",
    imageUnavailableLabel: "Unable to load this image.",
    footerBrand: "Metaprom",
    footerTagline: "Premium marketing for your business.",
    loadingLabel: "Loading commercial…",
    streamErrorLabel: "Unable to play this commercial.",
    unmuteLabel: "Unmute",
    playLabel: "Play",
    states: {
      notFound: {
        title: "Commercial not found",
        description: "This link no longer exists or was removed.",
      },
      unavailable: {
        title: "Commercial unavailable",
        description: "This commercial is not publicly available.",
      },
      invalidSlug: {
        title: "Invalid link",
        description: "The link you opened is not valid.",
      },
    },
  },
};

export function getPublicCommercialContent(locale: Locale): PublicCommercialContent {
  return CONTENT[locale];
}
