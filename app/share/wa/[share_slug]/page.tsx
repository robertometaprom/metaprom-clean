import type { Metadata } from "next";
import WhatsAppHandoffClient from "@/components/share/WhatsAppHandoffClient";
import { privateNoIndexMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = privateNoIndexMetadata();

type PageProps = {
  params: Promise<{ share_slug: string }>;
};

export default async function WhatsAppHandoffPage({ params }: PageProps) {
  const { share_slug: shareSlug } = await params;
  return <WhatsAppHandoffClient shareSlug={shareSlug} />;
}
