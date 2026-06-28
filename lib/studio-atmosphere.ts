import { SHOWCASE_ENTRIES } from "@/lib/showcases";

export type SocialPostPlatform = "tiktok" | "instagram" | "youtube" | "facebook";

export type SocialPostConfig = {
  id: string;
  platform: SocialPostPlatform;
  imageSrc?: string;
  videoSrc?: string;
  handle: string;
  caption: string;
  likes: string;
  position: string;
  rotation: number;
};

export type PlatformId =
  | "instagram"
  | "facebook"
  | "youtube"
  | "tiktok"
  | "amazon"
  | "mercado-libre"
  | "shopify";

export type PlatformCardConfig = {
  id: PlatformId;
  label: string;
};

export const HERO_VIDEO_SRC = "/showcase/restaurant/commercial.mp4";

export const HERO_PRESENTER_SRC = "/studio/hero-presenter.png";

export const SOCIAL_POSTS: SocialPostConfig[] = [
  {
    id: "tiktok-burger",
    platform: "tiktok",
    videoSrc: SHOWCASE_ENTRIES[0].video,
    handle: "@burger.house",
    caption: "El mejor burger de la ciudad 🍔",
    likes: "12.4K",
    position: "left-0 top-0 xl:left-[calc(50%-480px)]",
    rotation: -4,
  },
  {
    id: "instagram-coffee",
    platform: "instagram",
    imageSrc: SHOWCASE_ENTRIES[1].premiumImage,
    handle: "@cafelocal.mx",
    caption: "Nuevo blend de temporada ☕",
    likes: "2.1K",
    position: "left-2 bottom-20 xl:left-[calc(50%-440px)]",
    rotation: 3,
  },
  {
    id: "youtube-fitness",
    platform: "youtube",
    videoSrc: SHOWCASE_ENTRIES[3].video,
    handle: "@fitlife.studio",
    caption: "Transforma tu espacio",
    likes: "8.7K",
    position: "right-0 top-2 xl:right-[calc(50%-480px)]",
    rotation: 5,
  },
  {
    id: "facebook-house",
    platform: "facebook",
    imageSrc: SHOWCASE_ENTRIES[3].premiumImage,
    handle: "LuxuryHomes MX",
    caption: "Tu próximo hogar te espera",
    likes: "456",
    position: "right-2 bottom-16 xl:right-[calc(50%-440px)]",
    rotation: -3,
  },
];

export const PLATFORM_CARDS: PlatformCardConfig[] = [
  { id: "tiktok", label: "TikTok" },
  { id: "instagram", label: "Instagram" },
  { id: "youtube", label: "YouTube Shorts" },
  { id: "facebook", label: "Facebook" },
  { id: "amazon", label: "Amazon" },
  { id: "mercado-libre", label: "Mercado Libre" },
];

export const WELCOME_CHIPS = [
  "Quiero vender este producto",
  "Necesito un video para mi negocio",
  "Video para mis redes sociales",
] as const;

export const HERO_FEATURES = [
  {
    icon: "bolt",
    title: "Rápido",
    subtitle: "Resultados en minutos",
  },
  {
    icon: "target",
    title: "Para cualquier plataforma",
    subtitle: "TikTok, Instagram, YouTube y más",
  },
  {
    icon: "chart",
    title: "Más ventas",
    subtitle: "Contenido que convierte",
  },
] as const;

export const TRUST_ITEMS = [
  {
    icon: "droplet",
    text: "Sin marcas de agua en tus videos HD",
  },
  {
    icon: "check",
    text: "Listos para publicar en un clic",
  },
  {
    icon: "trend",
    text: "100% enfocado en hacerte vender más",
  },
] as const;
