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

export const HERO_VIDEOS = [
  "/showcase/restaurant/commercial.mp4",
  "/showcase/living-room/commercial.mp4",
  "/showcase/flower/commercial.mp4",
  "/showcase/coffee/commercial.mp4",
] as const;

export const HERO_VIDEO_SRC = HERO_VIDEOS[0];

export const HERO_PRESENTER_SRC = "/studio/hero-presenter-v4.png";

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
  { icon: "sparkles", title: "Mejora con IA" },
  { icon: "film", title: "Videos Cinemáticos" },
  { icon: "bolt", title: "Rápido y Fácil" },
  { icon: "chart", title: "Resultados que venden" },
] as const;

export type PromptCategoryIcon =
  | "food"
  | "real-estate"
  | "fashion"
  | "coffee"
  | "beauty"
  | "automotive"
  | "more";

export type PromptCategoryChip = {
  id: string;
  label: string;
  icon: PromptCategoryIcon;
  prompt: string;
};

export const PROMPT_CATEGORY_CHIPS: PromptCategoryChip[] = [
  {
    id: "food",
    label: "Alimentos",
    icon: "food",
    prompt: "Quiero atraer más clientes a mi restaurante",
  },
  {
    id: "real-estate",
    label: "Bienes raíces",
    icon: "real-estate",
    prompt: "Necesito un video para mostrar una propiedad",
  },
  {
    id: "fashion",
    label: "Moda",
    icon: "fashion",
    prompt: "Quiero vender más de este producto en línea",
  },
  {
    id: "coffee",
    label: "Cafeterías",
    icon: "coffee",
    prompt: "Quiero promocionar mi cafetería en redes",
  },
  {
    id: "beauty",
    label: "Belleza",
    icon: "beauty",
    prompt: "Quiero destacar mi marca de belleza",
  },
  {
    id: "automotive",
    label: "Automotriz",
    icon: "automotive",
    prompt: "Necesito un comercial para vender autos",
  },
  {
    id: "more",
    label: "Más",
    icon: "more",
    prompt: "Necesito un video para mi negocio",
  },
];

export type IndustryExampleIcon =
  | "restaurant"
  | "real-estate"
  | "ecommerce"
  | "coffee"
  | "beauty"
  | "automotive";

export type IndustryExample = {
  id: string;
  label: string;
  subtitle: string;
  imageSrc: string;
  icon: IndustryExampleIcon;
  prompt: string;
};

export const INDUSTRY_EXAMPLES: IndustryExample[] = [
  {
    id: "restaurant",
    label: "Restaurantes",
    subtitle: "Atrae más clientes",
    imageSrc: "/showcase/restaurant/premium.jpg",
    icon: "restaurant",
    prompt: "Quiero atraer más clientes a mi restaurante",
  },
  {
    id: "real-estate",
    label: "Bienes raíces",
    subtitle: "Muestra propiedades",
    imageSrc: "/showcase/living-room/premium.jpg",
    icon: "real-estate",
    prompt: "Necesito un video para mostrar una propiedad",
  },
  {
    id: "ecommerce",
    label: "Ecommerce",
    subtitle: "Vende más productos",
    imageSrc: "/showcase/restaurant/before.jpg",
    icon: "ecommerce",
    prompt: "Quiero vender más de este producto en línea",
  },
  {
    id: "coffee",
    label: "Cafeterías",
    subtitle: "Promociona tu café",
    imageSrc: "/showcase/coffee/premium.jpg",
    icon: "coffee",
    prompt: "Quiero promocionar mi cafetería en redes",
  },
  {
    id: "beauty",
    label: "Belleza",
    subtitle: "Destaca tu marca",
    imageSrc: "/showcase/flower/premium.jpg",
    icon: "beauty",
    prompt: "Quiero destacar mi marca de belleza",
  },
  {
    id: "automotive",
    label: "Automotriz",
    subtitle: "Impulsa tus ventas",
    imageSrc: "/showcase/living-room/before.jpg",
    icon: "automotive",
    prompt: "Necesito un comercial para vender autos",
  },
];

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
