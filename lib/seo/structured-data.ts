import { PUBLIC_SUPPORT_EMAIL } from "@/lib/support/public";
import {
  CANONICAL_BRAND_NAME,
  CANONICAL_SITE_ORIGIN,
  CANONICAL_SITE_URL,
  ORGANIZATION_LOGO_PATH,
} from "./site";

export const ORGANIZATION_ID = `${CANONICAL_SITE_ORIGIN}/#organization`;
export const WEBSITE_ID = `${CANONICAL_SITE_ORIGIN}/#website`;

export function getPublicStructuredData(): {
  "@context": "https://schema.org";
  "@graph": Array<Record<string, unknown>>;
} {
  const logoUrl = `${CANONICAL_SITE_ORIGIN}${ORGANIZATION_LOGO_PATH}`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORGANIZATION_ID,
        name: CANONICAL_BRAND_NAME,
        url: CANONICAL_SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: logoUrl,
        },
        email: PUBLIC_SUPPORT_EMAIL,
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        name: CANONICAL_BRAND_NAME,
        url: CANONICAL_SITE_URL,
        publisher: {
          "@id": ORGANIZATION_ID,
        },
      },
    ],
  };
}
