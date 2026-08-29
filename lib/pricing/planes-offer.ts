/**
 * /planes membership offer — UI/copy only.
 *
 * Golden, Premium, and Monthly are presentation. They must not map to Stripe
 * Price IDs or start checkout. The $180 one-off remains commercial_1.
 */
import type { Locale } from "@/lib/i18n";

export const PLANES_ONE_OFF_PRODUCT_KEY = "commercial_1" as const;

export type PlanesMembershipId = "premium" | "golden" | "monthly";

export type PlanesMembershipCard = {
  id: PlanesMembershipId;
  name: string;
  priceLabel: string;
  periodLabel: string;
  positioning: string;
  badge: string | null;
  recommended: boolean;
  features: readonly string[];
  accumulationNote: string | null;
  ctaLabel: string;
};

export type PlanesOfferCopy = {
  metaTitle: string;
  metaDescription: string;
  header: string;
  subtitleLines: readonly string[];
  philosophy: string;
  annualEyebrow: string;
  monthlyEyebrow: string;
  memberships: {
    premium: PlanesMembershipCard;
    golden: PlanesMembershipCard;
    monthly: PlanesMembershipCard;
  };
  oneOff: {
    question: string;
    name: string;
    priceLabel: string;
    ctaPurchase: string;
    ctaUnavailable: string;
  };
  paymentMethods: {
    title: string;
    stripeLabel: string;
  };
  footerCta: {
    title: string;
    body: string;
    ctaLabel: string;
    ctaHref: string;
  };
};

const ACCUMULATION_ES =
  "Tus comerciales no utilizados se acumulan mientras mantengas activa tu membresía.";
const ACCUMULATION_EN =
  "Unused commercials accumulate for as long as you keep your membership active.";

const COMING_SOON_ES = "Próximamente";
const COMING_SOON_EN = "Coming soon";

const PLANES_OFFER_ES: PlanesOfferCopy = {
  metaTitle: "Planes Metaprom — Membresía de producción publicitaria",
  metaDescription:
    "Membresías anuales Golden y Premium con comerciales, imágenes publicitarias ilimitadas y Director Creativo. Producción publicitaria continua para tu negocio.",
  header: "PLANES METAPROM",
  subtitleLines: [
    "Producción publicitaria continua para tu negocio.",
    "Comerciales, imágenes ilimitadas y Director Creativo — en una membresía.",
  ],
  philosophy:
    "Metaprom AI le da a tu negocio la capacidad de producir publicidad de forma continua, no un comercial aislado.",
  annualEyebrow: "Membresía anual",
  monthlyEyebrow: "Membresía mensual",
  memberships: {
    premium: {
      id: "premium",
      name: "PREMIUM",
      priceLabel: "$4,990 MXN",
      periodLabel: "/ año",
      positioning: "La membresía que recomendamos.",
      badge: "MEJOR VALOR",
      recommended: true,
      features: [
        "200 comerciales",
        "Imágenes publicitarias ilimitadas",
        "Director Creativo incluido",
        "Video HD listo para publicar",
        "Uso comercial",
        "Garantía de satisfacción",
      ],
      accumulationNote: ACCUMULATION_ES,
      ctaLabel: COMING_SOON_ES,
    },
    golden: {
      id: "golden",
      name: "GOLDEN",
      priceLabel: "$2,990 MXN",
      periodLabel: "/ año",
      positioning: "La membresía anual accesible.",
      badge: null,
      recommended: false,
      features: [
        "100 comerciales",
        "Imágenes publicitarias ilimitadas",
        "Director Creativo incluido",
        "Video HD listo para publicar",
        "Uso comercial",
        "Garantía de satisfacción",
      ],
      accumulationNote: ACCUMULATION_ES,
      ctaLabel: COMING_SOON_ES,
    },
    monthly: {
      id: "monthly",
      name: "MENSUAL",
      priceLabel: "$600 MXN",
      periodLabel: "/ mes",
      positioning: "",
      badge: null,
      recommended: false,
      features: [
        "15 comerciales",
        "Imágenes publicitarias ilimitadas",
        "Director Creativo incluido",
      ],
      accumulationNote: null,
      ctaLabel: COMING_SOON_ES,
    },
  },
  oneOff: {
    question: "¿Sólo necesitas un comercial?",
    name: "1 comercial",
    priceLabel: "$180 MXN",
    ctaPurchase: "Comprar",
    ctaUnavailable: "Próximamente",
  },
  paymentMethods: {
    title: "Formas de pago",
    stripeLabel: "🔒 Pagos procesados mediante Stripe",
  },
  footerCta: {
    title: "¿No sabes qué membresía elegir?",
    body: "Nuestro Director Creativo te ayuda a encontrar la mejor opción para tu negocio.",
    ctaLabel: "Hablar con Director",
    ctaHref: "/studio?director=1",
  },
};

const PLANES_OFFER_EN: PlanesOfferCopy = {
  metaTitle: "Metaprom Plans — Advertising production membership",
  metaDescription:
    "Golden and Premium annual memberships with commercials, unlimited advertising images, and Creative Director. Ongoing advertising production for your business.",
  header: "METAPROM PLANS",
  subtitleLines: [
    "Ongoing advertising production for your business.",
    "Commercials, unlimited images, and Creative Director — in a membership.",
  ],
  philosophy:
    "Metaprom AI gives a business an ongoing advertising production capability, not merely one isolated commercial.",
  annualEyebrow: "Annual membership",
  monthlyEyebrow: "Monthly membership",
  memberships: {
    premium: {
      id: "premium",
      name: "PREMIUM",
      priceLabel: "$4,990 MXN",
      periodLabel: "/ year",
      positioning: "The membership we recommend.",
      badge: "BEST VALUE",
      recommended: true,
      features: [
        "200 commercials",
        "Unlimited advertising images",
        "Creative Director included",
        "HD video ready to publish",
        "Commercial use",
        "Satisfaction guarantee",
      ],
      accumulationNote: ACCUMULATION_EN,
      ctaLabel: COMING_SOON_EN,
    },
    golden: {
      id: "golden",
      name: "GOLDEN",
      priceLabel: "$2,990 MXN",
      periodLabel: "/ year",
      positioning: "The accessible annual membership.",
      badge: null,
      recommended: false,
      features: [
        "100 commercials",
        "Unlimited advertising images",
        "Creative Director included",
        "HD video ready to publish",
        "Commercial use",
        "Satisfaction guarantee",
      ],
      accumulationNote: ACCUMULATION_EN,
      ctaLabel: COMING_SOON_EN,
    },
    monthly: {
      id: "monthly",
      name: "MONTHLY",
      priceLabel: "$600 MXN",
      periodLabel: "/ month",
      positioning: "",
      badge: null,
      recommended: false,
      features: [
        "15 commercials",
        "Unlimited advertising images",
        "Creative Director included",
      ],
      accumulationNote: null,
      ctaLabel: COMING_SOON_EN,
    },
  },
  oneOff: {
    question: "Only need one commercial?",
    name: "1 commercial",
    priceLabel: "$180 MXN",
    ctaPurchase: "Buy",
    ctaUnavailable: "Coming soon",
  },
  paymentMethods: {
    title: "Payment methods",
    stripeLabel: "🔒 Payments processed by Stripe",
  },
  footerCta: {
    title: "Not sure which membership to choose?",
    body: "Our Creative Director will help you find the best option for your business.",
    ctaLabel: "Talk to Director",
    ctaHref: "/studio?director=1",
  },
};

const PLANES_OFFER_BY_LOCALE: Record<Locale, PlanesOfferCopy> = {
  es: PLANES_OFFER_ES,
  en: PLANES_OFFER_EN,
};

export function getPlanesOfferCopy(locale: Locale = "es"): PlanesOfferCopy {
  return PLANES_OFFER_BY_LOCALE[locale];
}

export function getPlanesMembershipOrder(
  copy: PlanesOfferCopy,
): readonly PlanesMembershipCard[] {
  return [copy.memberships.premium, copy.memberships.golden];
}
