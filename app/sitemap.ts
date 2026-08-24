import type { MetadataRoute } from "next";
import { buildPublicSitemapEntries } from "@/lib/seo/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return buildPublicSitemapEntries();
}
