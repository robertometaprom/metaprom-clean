/**
 * Metaprom Pricing Catalog V1 — canonical source of truth for sellable packages.
 *
 * UI, CTAs, and future checkout must read from this catalog.
 * Never hardcode package prices or labels in React components.
 *
 * Prices are launch V1 values and may change; update here only.
 */

export type PricingCategory = "commercials" | "assets";

export type PricingBadgeId = "most_popular" | "best_value";

export type PricingPackageKind =
  | "standard"
  | "launch"
  | "promotion"
  | "enterprise"
  | "director_offer";

export type PricingCurrency = "MXN";

/** Stable product keys — do not rename; Stripe env vars and analytics depend on them. */
export type CommercialPackageId =
  | "commercial_1"
  | "commercial_5"
  | "commercial_10"
  | "commercial_20";

export type AssetsPackageId =
  | "assets_10"
  | "assets_25"
  | "assets_50"
  | "assets_100";

export type PricingPackageId = CommercialPackageId | AssetsPackageId;

export type PricingBadge = {
  id: PricingBadgeId;
  label: string;
};

export type PricingPackage = {
  id: PricingPackageId;
  category: PricingCategory;
  name: string;
  quantity: number;
  /** Package price in major currency units (MXN). */
  displayPrice: number;
  /** Per-unit price in major currency units (MXN). */
  unitPrice: number;
  /**
   * Savings vs single-unit baseline, as a percentage (0–100).
   * Null when this package is the baseline (no savings to show).
   */
  savings: number | null;
  /** Display-ready savings label (e.g. "≈29%", "45%"). Null when no savings. */
  savingsLabel: string | null;
  /**
   * Money saved vs buying the same quantity individually (major units, MXN).
   * Null when this package is the baseline.
   */
  savingsAmount: number | null;
  badge: PricingBadge | null;
  description: string;
  includedFeatures: readonly string[];
  /** Soft catalog flag — inactive packages never become purchasable. */
  active: boolean;
  /**
   * Env var name that will hold the Stripe Price ID when payments are activated.
   * Never invent or hardcode Price IDs. Do not reuse STRIPE_PRICE_ID_COMMERCIAL_VIDEO.
   */
  stripeEnvironmentVariable: string;
  currency: PricingCurrency;
  kind: PricingPackageKind;
  sortOrder: number;
};

export type PricingCategoryMeta = {
  id: PricingCategory;
  title: string;
  subtitle: string;
};

export type PricingFaqItem = {
  question: string;
  paragraphs: readonly string[];
};

export const PRICING_CURRENCY: PricingCurrency = "MXN";

export const PRICING_BADGES: Record<PricingBadgeId, PricingBadge> = {
  most_popular: {
    id: "most_popular",
    label: "Más popular",
  },
  best_value: {
    id: "best_value",
    label: "Mejor precio por comercial",
  },
};

export const PRICING_PAGE_COPY = {
  header: "PLANES METAPROM",
  subtitleLines: [
    "Comerciales e imágenes publicitarias listos para usar.",
    "Sin suscripciones.",
    "Sin vencimientos.",
    "Sin sistemas de créditos difíciles de entender.",
  ],
  philosophy: "Resultados publicitarios terminados. No créditos. No cómputo. No planes mensuales.",
  unitLabel: "por unidad",
  savingsLabel: "Ahorras",
  savingsVsIndividual: "menos que comprarlos por separado",
  ctaUnavailable: "Próximamente",
  ctaComingSoon: "Próximamente",
  ctaPurchase: "Comprar",
  neverExpireNote: "Los paquetes comprados nunca vencen.",
  assetRule:
    "Una imagen publicitaria corresponde a una pieza publicitaria terminada o a un formato.",
  paymentMethods: {
    title: "Formas de pago",
    stripeLabel: "🔒 Pagos seguros mediante Stripe",
  },
  footerCta: {
    title: "¿No sabes qué paquete elegir?",
    body: "Nuestro Director Creativo te ayudará a encontrar la mejor opción antes de comenzar tu proyecto.",
    ctaLabel: "Hablar con Director",
    ctaHref: "/studio?director=1",
  },
} as const;

export const PRICING_CATEGORIES: readonly PricingCategoryMeta[] = [
  {
    id: "commercials",
    title: "COMERCIALES",
    subtitle: "Comerciales HD listos para publicar.",
  },
  {
    id: "assets",
    title: "IMÁGENES PUBLICITARIAS",
    subtitle:
      "Crea fotografías comerciales, imágenes para Amazon o Mercado Libre, flyers, pósters, menús, banners, catálogos, lonas, publicaciones para redes sociales y muchos otros materiales publicitarios.",
  },
] as const;

const COMMERCIAL_FEATURES = [
  "Director Creativo incluido",
  "Comercial HD",
  "Hasta 8 segundos",
  "Ajustes razonables del mismo proyecto",
  "Descarga HD",
  "Uso comercial",
  "Sin vencimiento",
] as const;

const ASSET_FEATURES = [
  "Director Creativo incluido",
  "Imagen publicitaria terminada",
  "Listo para publicar o imprimir",
  "Uso comercial",
  "Sin vencimiento",
] as const;

const ASSET_FORMAT_EXAMPLES = [
  "Fotografía de producto",
  "Imagen para Amazon",
  "Imagen para Mercado Libre",
  "Flyer",
  "Poster",
  "Banner",
  "Menú",
  "Gráfico para redes",
  "Lona promocional",
  "Gráfico promocional",
  "Etiqueta de producto",
  "Concepto de empaque",
  "Portada",
  "Ficha de producto",
] as const;

/**
 * Canonical V1 package catalog.
 * Add / deactivate / promote packages here — the /planes UI reads this list.
 */
export const PRICING_PACKAGES: readonly PricingPackage[] = [
  {
    id: "commercial_1",
    category: "commercials",
    name: "1 Comercial",
    quantity: 1,
    displayPrice: 180,
    unitPrice: 180,
    savings: null,
    savingsLabel: null,
    savingsAmount: null,
    badge: null,
    description: "1 comercial HD listo para usar.",
    includedFeatures: COMMERCIAL_FEATURES,
    active: true,
    stripeEnvironmentVariable: "STRIPE_PRICE_ID_COMMERCIAL_1",
    currency: "MXN",
    kind: "launch",
    sortOrder: 10,
  },
  {
    id: "commercial_5",
    category: "commercials",
    name: "5 Comerciales",
    quantity: 5,
    displayPrice: 640,
    unitPrice: 128,
    savings: 29,
    savingsLabel: "≈29%",
    savingsAmount: 260,
    badge: null,
    description: "5 comerciales HD con mejor precio por unidad.",
    includedFeatures: COMMERCIAL_FEATURES,
    active: true,
    stripeEnvironmentVariable: "STRIPE_PRICE_ID_COMMERCIAL_5",
    currency: "MXN",
    kind: "launch",
    sortOrder: 20,
  },
  {
    id: "commercial_10",
    category: "commercials",
    name: "10 Comerciales",
    quantity: 10,
    displayPrice: 990,
    unitPrice: 99,
    savings: 45,
    savingsLabel: "45%",
    savingsAmount: 810,
    badge: PRICING_BADGES.most_popular,
    description: "10 comerciales HD — el paquete más elegido.",
    includedFeatures: COMMERCIAL_FEATURES,
    active: true,
    stripeEnvironmentVariable: "STRIPE_PRICE_ID_COMMERCIAL_10",
    currency: "MXN",
    kind: "launch",
    sortOrder: 30,
  },
  {
    id: "commercial_20",
    category: "commercials",
    name: "20 Comerciales",
    quantity: 20,
    displayPrice: 1780,
    unitPrice: 89,
    savings: 51,
    savingsLabel: "≈51%",
    savingsAmount: 1820,
    badge: PRICING_BADGES.best_value,
    description: "20 comerciales HD — el mejor valor por unidad.",
    includedFeatures: COMMERCIAL_FEATURES,
    active: true,
    stripeEnvironmentVariable: "STRIPE_PRICE_ID_COMMERCIAL_20",
    currency: "MXN",
    kind: "launch",
    sortOrder: 40,
  },
  {
    id: "assets_10",
    category: "assets",
    name: "10 Imágenes Publicitarias",
    quantity: 10,
    displayPrice: 99,
    unitPrice: 9.9,
    savings: null,
    savingsLabel: null,
    savingsAmount: null,
    badge: null,
    description: "10 imágenes publicitarias terminadas.",
    includedFeatures: ASSET_FEATURES,
    active: true,
    stripeEnvironmentVariable: "STRIPE_PRICE_ID_ASSETS_10",
    currency: "MXN",
    kind: "launch",
    sortOrder: 110,
  },
  {
    id: "assets_25",
    category: "assets",
    name: "25 Imágenes Publicitarias",
    quantity: 25,
    displayPrice: 199,
    unitPrice: 7.96,
    savings: 20,
    savingsLabel: "≈20%",
    savingsAmount: 48.5,
    badge: null,
    description: "25 imágenes publicitarias terminadas.",
    includedFeatures: ASSET_FEATURES,
    active: true,
    stripeEnvironmentVariable: "STRIPE_PRICE_ID_ASSETS_25",
    currency: "MXN",
    kind: "launch",
    sortOrder: 120,
  },
  {
    id: "assets_50",
    category: "assets",
    name: "50 Imágenes Publicitarias",
    quantity: 50,
    displayPrice: 349,
    unitPrice: 6.98,
    savings: 29,
    savingsLabel: "≈29%",
    savingsAmount: 146,
    badge: PRICING_BADGES.most_popular,
    description: "50 imágenes publicitarias — el paquete más elegido.",
    includedFeatures: ASSET_FEATURES,
    active: true,
    stripeEnvironmentVariable: "STRIPE_PRICE_ID_ASSETS_50",
    currency: "MXN",
    kind: "launch",
    sortOrder: 130,
  },
  {
    id: "assets_100",
    category: "assets",
    name: "100 Imágenes Publicitarias",
    quantity: 100,
    displayPrice: 599,
    unitPrice: 5.99,
    savings: 39,
    savingsLabel: "≈39%",
    savingsAmount: 391,
    badge: null,
    description: "100 imágenes publicitarias al mejor precio por unidad.",
    includedFeatures: ASSET_FEATURES,
    active: true,
    stripeEnvironmentVariable: "STRIPE_PRICE_ID_ASSETS_100",
    currency: "MXN",
    kind: "launch",
    sortOrder: 140,
  },
] as const;

const PRICING_FAQ_ES = {
  title: "Preguntas frecuentes",
  items: [
    {
      question: "¿Cómo funcionan los proyectos y ajustes?",
      paragraphs: [
        "Compras un Comercial Premium terminado, no un intento de generación de IA.",
        "El objetivo de Metaprom AI es tu satisfacción con el proyecto original, dentro del alcance del servicio contratado.",
        "El Director Creativo te ayuda a optimizar el proyecto antes de generar, siempre que sea posible.",
        "Los ajustes razonables se mantienen dentro del mismo proyecto. Eso no incluye conceptos ilimitados ni cambios de alcance.",
        "Si hay un error de la IA o de Metaprom AI, seguimos trabajando para completar el producto comprado. Eso no debería consumir tus compras de forma injusta.",
        "Si Metaprom AI no puede entregar un Comercial Premium satisfactorio dentro de ese alcance, se reembolsa el pago correspondiente.",
        "Si cancelas, abandonas el proyecto, cambias el producto solicitado o, después de una entrega satisfactoria, cambias de idea, esta garantía no aplica de forma automática.",
      ],
    },
    {
      question: "¿Los paquetes vencen?",
      paragraphs: [
        "No.",
        "Tus paquetes permanecerán disponibles hasta que los utilices.",
      ],
    },
    {
      question: "¿Qué se considera el mismo proyecto?",
      paragraphs: [
        "El mismo proyecto es la misma pieza publicitaria en la que ya estás trabajando: el mismo producto o servicio, la misma campaña y la misma idea creativa.",
        "Los ajustes razonables incluyen cambios de tono, ritmo, detalle visual o refinamiento del mensaje — siempre dentro de esa misma dirección.",
        "Si el resultado se siente como una continuación natural de lo que pediste al inicio, sigue siendo el mismo proyecto.",
      ],
    },
    {
      question: "¿Cuándo comienza un nuevo proyecto?",
      paragraphs: [
        "Comienza un proyecto nuevo cuando cambia el producto, el servicio, la campaña o el concepto creativo.",
        "Por ejemplo: pasar de un producto a otro, de un servicio a una promoción distinta, o de una idea creativa a una dirección completamente diferente.",
        "En esos casos se utiliza una unidad adicional de tu paquete.",
      ],
    },
  ] satisfies readonly PricingFaqItem[],
} as const;

const PRICING_FAQ_EN = {
  title: "Frequently asked questions",
  items: [
    {
      question: "How do projects and adjustments work?",
      paragraphs: [
        "You are purchasing a finished Premium Commercial, not an AI-generation attempt.",
        "Metaprom AI's aim is your satisfaction with the original project, within the scope of the service you purchased.",
        "The Creative Director helps you refine the project before generation whenever possible.",
        "Reasonable adjustments stay within the same project. That does not include unlimited concepts or scope changes.",
        "If AI or Metaprom AI makes an error, we keep working to complete the purchased product. That should not consume your purchases unfairly.",
        "If Metaprom AI cannot deliver a satisfactory Premium Commercial within that scope, the corresponding payment is refunded.",
        "If you cancel, abandon the project, change the requested product, or change your mind after a satisfactory delivery, this guarantee does not apply automatically.",
      ],
    },
    {
      question: "Do packages expire?",
      paragraphs: [
        "No.",
        "Your packages remain available until you use them.",
      ],
    },
    {
      question: "What counts as the same project?",
      paragraphs: [
        "The same project is the same advertising piece you are already working on: the same product or service, the same campaign, and the same creative idea.",
        "Reasonable adjustments include changes of tone, pacing, visual detail, or message refinement — always within that same direction.",
        "If the result feels like a natural continuation of what you originally asked for, it is still the same project.",
      ],
    },
    {
      question: "When does a new project begin?",
      paragraphs: [
        "A new project begins when the product, service, campaign, or creative concept changes.",
        "For example: moving from one product to another, from a service to a different promotion, or from one creative idea to a completely different direction.",
        "In those cases, an additional unit from your package is used.",
      ],
    },
  ] satisfies readonly PricingFaqItem[],
} as const;

export const PRICING_FAQ_BY_LOCALE = {
  es: PRICING_FAQ_ES,
  en: PRICING_FAQ_EN,
} as const;

export const PRICING_FAQ = PRICING_FAQ_BY_LOCALE.es;

export function getPricingFaq(locale: "en" | "es" = "es") {
  return PRICING_FAQ_BY_LOCALE[locale];
}

export const ASSET_PRODUCT_NAME = "IMÁGENES PUBLICITARIAS";

export const ASSET_FORMAT_EXAMPLES_LIST = ASSET_FORMAT_EXAMPLES;
