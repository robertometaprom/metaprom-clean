import type { Metadata } from "next";
import {
  CANONICAL_BRAND_NAME,
  OPEN_GRAPH_IMAGE_PATH,
  canonicalUrl,
} from "./site";

export function publicIndexMetadata(input: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const url = canonicalUrl(input.path);

  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: url },
    openGraph: {
      title: input.title,
      description: input.description,
      url,
      siteName: CANONICAL_BRAND_NAME,
      type: "website",
      images: [
        {
          url: OPEN_GRAPH_IMAGE_PATH,
          alt: CANONICAL_BRAND_NAME,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [OPEN_GRAPH_IMAGE_PATH],
    },
    robots: { index: true, follow: true },
  };
}

export function privateNoIndexMetadata(title?: string): Metadata {
  return {
    ...(title ? { title } : {}),
    robots: { index: false, follow: false },
  };
}
