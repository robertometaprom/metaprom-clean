/**
 * /planes membership offer — UI/copy only.
 *
 * Golden and Premium are the two membership levels. Monthly and annual are
 * purchase modalities on each card. They must not map to Stripe Price IDs or
 * start checkout. The $180 one-off remains commercial_1.
 */
import type { Locale } from "@/lib/i18n";

export const PLANES_ONE_OFF_PRODUCT_KEY = "commercial_1" as const;

export type PlanesMembershipId = "premium" | "golden";
export type PlanesBillingCycle = "monthly" | "annual";

export const PLANES_DEFAULT_BILLING_CYCLE: PlanesBillingCycle = "annual";

export type PlanesBillingOption = {
  cycle: PlanesBillingCycle;
  priceLabel: string;
  periodLabel: string;
  commercialsLabel: string;
  savingsLabel: string | null;
};

export type PlanesMembershipCard = {
  id: PlanesMembershipId;
  name: string;
  positioning: string;
  badge: string | null;
  recommended: boolean;
  coreBenefits: readonly string[];
  accumulationNote: string;
  ctaLabel: string;
  monthly: PlanesBillingOption;
  annual: PlanesBillingOption;
};

export type PlanesOfferCopy = {
  metaTitle: string;
  metaDescription: string;
  header: string;
  subtitleLines: readonly string[];
  philosophy: string;
  membershipEyebrow: string;
  billing: {
    monthlyLabel: string;
    annualLabel: string;
    selectorAriaLabel: string;
  };
  memberships: {
    golden: PlanesMembershipCard;
    premium: PlanesMembershipCard;
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

const CORE_BENEFITS_ES = [
  "Imágenes publicitarias ilimitadas",
  "Director Creativo incluido",
  "Video HD listo para publicar",
  "Uso comercial",
  "Garantía de satisfacción",
] as const;

const CORE_BENEFITS_EN = [
  "Unlimited advertising images",
  "Creative Director included",
  "HD video ready to publish",
  "Commercial use",
  "Satisfaction guarantee",
] as const;

const PLANES_OFFER_ES: PlanesOfferCopy = {
  metaTitle: "Planes Metaprom — Membresía de producción publicitaria",
  metaDescription:
    "Membresías Golden y Premium, mensual o anual, con comerciales, imágenes publicitarias ilimitadas y Director Creativo. Producción publicitaria continua para tu negocio.",
  header: "PLANES METAPROM",
  subtitleLines: [
    "Producción publicitaria continua para tu negocio.",
    "Comerciales, imágenes ilimitadas y Director Creativo — en una membresía.",
  ],
  philosophy:
    "Metaprom AI le da a tu negocio la capacidad de producir publicidad de forma continua, no un comercial aislado.",
  membershipEyebrow: "Elige Golden o Premium",
  billing: {
    monthlyLabel: "Mensual",
    annualLabel: "Anual",
    selectorAriaLabel: "Elige mensual o anual",
  },
  memberships: {
    golden: {
      id: "golden",
      name: "GOLDEN",
      positioning: "La membresía accesible.",
      badge: null,
      recommended: false,
      coreBenefits: CORE_BENEFITS_ES,
      accumulationNote: ACCUMULATION_ES,
      ctaLabel: COMING_SOON_ES,
      monthly: {
        cycle: "monthly",
        priceLabel: "$350 MXN",
        periodLabel: "/ mes",
        commercialsLabel: "8 comerciales",
        savingsLabel: null,
      },
      annual: {
        cycle: "annual",
        priceLabel: "$2,990 MXN",
        periodLabel: "/ año",
        commercialsLabel: "100 comerciales",
        savingsLabel: "Ahorra $1,210 al año",
      },
    },
    premium: {
      id: "premium",
      name: "PREMIUM",
      positioning: "La membresía que recomendamos.",
      badge: "MEJOR VALOR",
      recommended: true,
      coreBenefits: CORE_BENEFITS_ES,
      accumulationNote: ACCUMULATION_ES,
      ctaLabel: COMING_SOON_ES,
      monthly: {
        cycle: "monthly",
        priceLabel: "$600 MXN",
        periodLabel: "/ mes",
        commercialsLabel: "15 comerciales",
        savingsLabel: null,
      },
      annual: {
        cycle: "annual",
        priceLabel: "$4,990 MXN",
        periodLabel: "/ año",
        commercialsLabel: "200 comerciales",
        savingsLabel: "Ahorra $2,210 al año",
      },
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
    "Golden and Premium memberships, monthly or annual, with commercials, unlimited advertising images, and Creative Director. Ongoing advertising production for your business.",
  header: "METAPROM PLANS",
  subtitleLines: [
    "Ongoing advertising production for your business.",
    "Commercials, unlimited images, and Creative Director — in a membership.",
  ],
  philosophy:
    "Metaprom AI gives a business an ongoing advertising production capability, not merely one isolated commercial.",
  membershipEyebrow: "Choose Golden or Premium",
  billing: {
    monthlyLabel: "Monthly",
    annualLabel: "Annual",
    selectorAriaLabel: "Choose monthly or annual",
  },
  memberships: {
    golden: {
      id: "golden",
      name: "GOLDEN",
      positioning: "The accessible membership.",
      badge: null,
      recommended: false,
      coreBenefits: CORE_BENEFITS_EN,
      accumulationNote: ACCUMULATION_EN,
      ctaLabel: COMING_SOON_EN,
      monthly: {
        cycle: "monthly",
        priceLabel: "$350 MXN",
        periodLabel: "/ month",
        commercialsLabel: "8 commercials",
        savingsLabel: null,
      },
      annual: {
        cycle: "annual",
        priceLabel: "$2,990 MXN",
        periodLabel: "/ year",
        commercialsLabel: "100 commercials",
        savingsLabel: "Save $1,210 a year",
      },
    },
    premium: {
      id: "premium",
      name: "PREMIUM",
      positioning: "The membership we recommend.",
      badge: "BEST VALUE",
      recommended: true,
      coreBenefits: CORE_BENEFITS_EN,
      accumulationNote: ACCUMULATION_EN,
      ctaLabel: COMING_SOON_EN,
      monthly: {
        cycle: "monthly",
        priceLabel: "$600 MXN",
        periodLabel: "/ month",
        commercialsLabel: "15 commercials",
        savingsLabel: null,
      },
      annual: {
        cycle: "annual",
        priceLabel: "$4,990 MXN",
        periodLabel: "/ year",
        commercialsLabel: "200 commercials",
        savingsLabel: "Save $2,210 a year",
      },
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
  return [copy.memberships.golden, copy.memberships.premium];
}

export function getPlanesBillingOption(
  membership: PlanesMembershipCard,
  cycle: PlanesBillingCycle = PLANES_DEFAULT_BILLING_CYCLE,
): PlanesBillingOption {
  return membership[cycle];
}
