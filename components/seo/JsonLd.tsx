import { getPublicStructuredData } from "@/lib/seo/structured-data";

export default function JsonLd() {
  const jsonLd = getPublicStructuredData();

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
      }}
    />
  );
}
