import type { Mode } from "./prompts";

export type ProductId =
  | "premium-image"
  | "amazon-optimization"
  | "mercado-libre-optimization"
  | "shopify-optimization"
  | "instagram-version"
  | "facebook-version"
  | "hd-video"
  | "restaurant-poster"
  | "custom-creative";

export type CatalogProduct = {
  id: ProductId;
  label: string;
  mode: Mode;
  destination: string;
  industry?: string;
};

export const PRODUCT_CATALOG: Record<ProductId, CatalogProduct> = {
  "premium-image": {
    id: "premium-image",
    label: "Imagen premium",
    mode: "premium",
    destination: "general",
  },
  "amazon-optimization": {
    id: "amazon-optimization",
    label: "Optimizar para Amazon",
    mode: "amazon",
    destination: "amazon",
    industry: "marketplace",
  },
  "mercado-libre-optimization": {
    id: "mercado-libre-optimization",
    label: "Optimizar para Mercado Libre",
    mode: "mercado-libre",
    destination: "mercado-libre",
    industry: "marketplace",
  },
  "shopify-optimization": {
    id: "shopify-optimization",
    label: "Optimizar para Shopify",
    mode: "premium",
    destination: "shopify",
    industry: "ecommerce",
  },
  "instagram-version": {
    id: "instagram-version",
    label: "Versión para Instagram",
    mode: "social",
    destination: "instagram",
    industry: "social",
  },
  "facebook-version": {
    id: "facebook-version",
    label: "Versión para Facebook",
    mode: "social",
    destination: "facebook",
    industry: "social",
  },
  "hd-video": {
    id: "hd-video",
    label: "Video comercial HD",
    mode: "premium",
    destination: "video",
    industry: "video",
  },
  "restaurant-poster": {
    id: "restaurant-poster",
    label: "Póster para restaurante",
    mode: "custom",
    destination: "restaurant",
    industry: "restaurant",
  },
  "custom-creative": {
    id: "custom-creative",
    label: "Creativo personalizado",
    mode: "custom",
    destination: "custom",
  },
};

export type IntentResult =
  | {
      status: "matched";
      productId: ProductId;
      product: CatalogProduct;
    }
  | {
      status: "unavailable";
      requestedService: string;
      industry?: string;
      intendedDestination?: string;
    }
  | {
      status: "off-topic";
    };

const OFF_TOPIC_PATTERNS = [
  /\b(pol[ií]tic|elecci[oó]n|presidente|gobierno|partido político)\b/i,
  /\b(deporte|f[uú]tbol|basket|nba|mundial|champions|gol\b|partido de)\b/i,
  /\b(clima|tiempo atmosf[eé]rico|pron[oó]stico del tiempo)\b/i,
  /\b(tarea escolar|homework|examen de|matem[aá]ticas para)\b/i,
  /\b(qu[ií]en (es|fue|invent[oó])|who (is|was|invented))\b/i,
  /\b(receta de|c[oó]mo cocinar(?!.*(restaurante|negocio|local)))\b/i,
  /\b(noticias de hoy|news today)\b/i,
  /\b(abogad[oa]|consejo legal|demanda judicial|juicio penal)\b/i,
  /\b(m[eé]dic[oa]|doctor[a]?|enfermedad|s[ií]ntoma|diagn[oó]stico|tratamiento m[eé]dico)\b/i,
];

const INTENT_RULES: Array<{
  productId: ProductId;
  patterns: RegExp[];
}> = [
  {
    productId: "amazon-optimization",
    patterns: [/\bamazon\b/i, /\bamz\b/i, /vender en amazon/i, /listing de amazon/i],
  },
  {
    productId: "mercado-libre-optimization",
    patterns: [
      /\bmercado\s*libre\b/i,
      /\bmercadolibre\b/i,
      /\bml\b.*(vender|producto|publicar)/i,
    ],
  },
  {
    productId: "shopify-optimization",
    patterns: [/\bshopify\b/i, /tienda en l[ií]nea/i, /tienda online/i],
  },
  {
    productId: "instagram-version",
    patterns: [
      /\binstagram\b/i,
      /\breel\b/i,
      /\bstory\b/i,
      /\bstorie?s\b/i,
      /anuncio de instagram/i,
    ],
  },
  {
    productId: "facebook-version",
    patterns: [/\bfacebook\b/i, /\bmeta ads\b/i, /anuncio de facebook/i],
  },
  {
    productId: "hd-video",
    patterns: [
      /video comercial/i,
      /video hd/i,
      /comercial en video/i,
      /spot publicitario/i,
      /video publicitario/i,
      /necesito un video/i,
      /quiero un video/i,
      /video para mi negocio/i,
      /video para mis redes/i,
      /video para (tiktok|youtube|facebook|instagram)/i,
    ],
  },
  {
    productId: "restaurant-poster",
    patterns: [
      /restaurante/i,
      /cafeter[ií]a/i,
      /men[uú] del d[ií]a/i,
      /p[oó]ster de comida/i,
      /cartel de restaurante/i,
    ],
  },
  {
    productId: "premium-image",
    patterns: [
      /vender (este|mi|un) producto/i,
      /mejor foto/i,
      /foto premium/i,
      /imagen premium/i,
      /mejorar (mi|la|una) foto/i,
      /foto de producto/i,
      /sell (this|my) product/i,
      /better (amazon|product) photo/i,
      /product photo/i,
    ],
  },
  {
    productId: "custom-creative",
    patterns: [
      /p[oó]ster/i,
      /anuncio/i,
      /publicidad/i,
      /campaña/i,
      /promoci[oó]n/i,
      /black friday/i,
      /navidad/i,
    ],
  },
];

export function classifyIntent(rawInput: string): IntentResult {
  const input = rawInput.trim();

  if (input.length < 3) {
    return { status: "off-topic" };
  }

  for (const pattern of OFF_TOPIC_PATTERNS) {
    if (pattern.test(input)) {
      return { status: "off-topic" };
    }
  }

  for (const rule of INTENT_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(input))) {
      const product = PRODUCT_CATALOG[rule.productId];
      return { status: "matched", productId: rule.productId, product };
    }
  }

  return {
    status: "unavailable",
    requestedService: input.slice(0, 200),
    industry: inferIndustry(input),
    intendedDestination: inferDestination(input),
  };
}

export const DEFAULT_STUDIO_PRODUCT_ID: ProductId = "premium-image";

export type StudioWorkflowResolution =
  | {
      blocked: true;
      reason: "off-topic";
    }
  | {
      blocked: false;
      product: CatalogProduct;
      productId: ProductId;
      matchedExplicitly: boolean;
      requestedService: string;
      industry?: string;
      intendedDestination?: string;
    };

/**
 * Photo-first Studio orchestration. Intent classification enriches generation
 * but only blocks the flow when there is no photo and the request is off-topic.
 */
export function resolveStudioWorkflow(
  rawInput: string,
  hasPhoto: boolean,
): StudioWorkflowResolution {
  const input = rawInput.trim();

  if (hasPhoto) {
    if (input.length < 3) {
      return buildDefaultWorkflow("foto de producto");
    }

    const result = classifyIntent(input);
    if (result.status === "matched") {
      return {
        blocked: false,
        product: result.product,
        productId: result.productId,
        matchedExplicitly: true,
        requestedService: input,
        industry: result.product.industry,
        intendedDestination: result.product.destination,
      };
    }

    return buildDefaultWorkflow(
      input,
      result.status === "unavailable" ? result : undefined,
    );
  }

  if (input.length < 3) {
    return { blocked: true, reason: "off-topic" };
  }

  const result = classifyIntent(input);

  if (result.status === "off-topic") {
    return { blocked: true, reason: "off-topic" };
  }

  if (result.status === "matched") {
    return {
      blocked: false,
      product: result.product,
      productId: result.productId,
      matchedExplicitly: true,
      requestedService: input,
      industry: result.product.industry,
      intendedDestination: result.product.destination,
    };
  }

  return buildDefaultWorkflow(input, result);
}

function buildDefaultWorkflow(
  input: string,
  result?: Extract<IntentResult, { status: "unavailable" }>,
): Extract<StudioWorkflowResolution, { blocked: false }> {
  const product = PRODUCT_CATALOG[DEFAULT_STUDIO_PRODUCT_ID];

  return {
    blocked: false,
    product,
    productId: DEFAULT_STUDIO_PRODUCT_ID,
    matchedExplicitly: false,
    requestedService: input.slice(0, 200) || "foto de producto",
    industry: result?.industry ?? inferIndustry(input),
    intendedDestination: result?.intendedDestination ?? inferDestination(input),
  };
}

function inferIndustry(input: string): string | undefined {
  if (/restaurante|cafeter[ií]a|comida/i.test(input)) return "restaurant";
  if (/ropa|moda|fashion/i.test(input)) return "fashion";
  if (/belleza|cosm[eé]tica|skincare/i.test(input)) return "beauty";
  if (/inmobiliaria|bienes ra[ií]ces/i.test(input)) return "real-estate";
  return undefined;
}

function inferDestination(input: string): string | undefined {
  if (/tiktok/i.test(input)) return "tiktok";
  if (/youtube/i.test(input)) return "youtube";
  if (/whatsapp/i.test(input)) return "whatsapp";
  if (/linkedin/i.test(input)) return "linkedin";
  return undefined;
}

export const EXAMPLE_PROMPTS = [
  "Quiero vender este producto",
  "Necesito una mejor foto para Amazon",
  "Quiero un póster para mi restaurante",
  "Quiero un anuncio para Instagram",
  "Quiero un video comercial",
] as const;

export const VIDEO_TEASER_PROMPT =
  "Cinematic product showcase with smooth camera movement and professional studio lighting. Elegant commercial teaser.";
